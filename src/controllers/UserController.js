/*
 * ============================================================================
 * UserController — cadastro, listagem, edição e exclusão de usuários/admins.
 *
 * É o controller com as regras de PERMISSÃO mais detalhadas. Conceitos-chave:
 * - "self": quando o usuário está agindo sobre a PRÓPRIA conta (req.userId == id
 *   da URL). Regras são mais permissivas para os próprios dados.
 * - Ações sobre OUTROS dependem de permissões (userCan): MANAGE_ORGANIZERS,
 *   MANAGE_ADMINS, VIEW_ALL.
 * - O super-admin (dono do sistema) é protegido: ninguém o edita/exclui.
 * As permissões necessárias já são exigidas nas ROTAS (UserRoutes.js); aqui
 * fazemos as checagens mais finas que dependem do alvo.
 * ============================================================================
 */
const { User } = require('../database/models');
const bcrypt = require('bcrypt');
const { ALL_PERMISSIONS, PERMISSIONS, userCan } = require('../constants/permissions');
const deleteTournamentCascade = require('../services/deleteTournamentCascade');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * Filtra uma lista de permissões, descartando qualquer valor que não exista no
 * catálogo oficial (ALL_PERMISSIONS). Protege contra valores inválidos/forjados
 * vindos do corpo da requisição. Sempre devolve um array.
 * @param {string[]} permissions - lista recebida do cliente.
 * @returns {string[]} apenas as permissões válidas.
 */
function sanitizePermissions(permissions) {
   if (!Array.isArray(permissions)) return [];
   return permissions.filter((p) => ALL_PERMISSIONS.includes(p));
}

/**
 * Converte um usuário do banco numa versão segura para enviar ao cliente,
 * removendo campos sensíveis (senha e refresh token).
 * @param {object} user - instância do model User.
 * @returns {object} objeto do usuário sem `password` e `refreshToken`.
 */
function publicUser(user) {
   const json = user.toJSON();
   delete json.password;
   delete json.refreshToken;
   return json;
}

module.exports = {
   /**
    * POST /users/register — auto-cadastro público de um usuário comum.
    * Sempre cria com role 'user' (NUNCA admin), independentemente do que o corpo
    * mande. A senha é guardada como HASH (bcrypt), nunca em texto puro. Retorna
    * 409 se o e-mail já existir.
    */
   register: asyncHandler(async (req, res) => {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
         return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
      }

      const userExists = await User.findOne({ where: { email } });
      if (userExists) {
         return res.status(409).json({ error: 'Este e-mail já está em uso.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await User.create({
         name,
         email,
         password: hashedPassword,
         role: 'user', // Sempre cria como usuário comum
         permissions: [],
         isActive: true,
         isSuperAdmin: false,
      });

      return res.status(201).json({ message: 'Usuário criado com sucesso', data: publicUser(user) });
   }),

   /**
    * POST /users — cria usuário ou admin (uso interno da gestão).
    * Diferente do register, aqui PODE criar admin e definir permissões — por
    * isso a rota exige MANAGE_ADMINS. As permissões só são aplicadas se o role
    * final for admin, e passam pelo `sanitizePermissions`.
    */
   create: asyncHandler(async (req, res) => {
      const { name, email, password, role, permissions } = req.body;

      if (!name || !email || !password) {
         return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
      }

      const userExists = await User.findOne({ where: { email } });
      if (userExists) {
         return res.status(409).json({ error: 'Este e-mail já está em uso.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const finalRole = role === 'admin' ? 'admin' : 'user';

      const user = await User.create({
         name,
         email,
         password: hashedPassword,
         role: finalRole,
         // Permissões só fazem sentido para admin; super-admin nunca via API
         permissions: finalRole === 'admin' ? sanitizePermissions(permissions) : [],
         isActive: true,
         isSuperAdmin: false,
      });

      return res.status(201).json({ message: 'Usuário criado com sucesso', data: publicUser(user) });
   }),

   /**
    * GET /users — lista todos os usuários (mais recentes primeiro).
    * `attributes.exclude` evita trazer senha e refresh token do banco.
    */
   findAll: asyncHandler(async (req, res) => {
      const users = await User.findAll({
         attributes: { exclude: ['password', 'refreshToken'] },
         order: [['createdAt', 'DESC']],
      });

      return res.status(200).json({ data: users });
   }),

   /**
    * GET /users/:id — busca um usuário. O próprio usuário pode ver seus dados
    * ("self"); outras pessoas só com permissão de visualização/gestão.
    */
   findById: asyncHandler(async (req, res) => {
      const { id } = req.params;
      const isSelf = req.userId === parseInt(id);

      if (!isSelf) {
         const requester = await User.findByPk(req.userId);
         const canView =
            userCan(requester, PERMISSIONS.VIEW_ALL) ||
            userCan(requester, PERMISSIONS.MANAGE_ORGANIZERS) ||
            userCan(requester, PERMISSIONS.MANAGE_ADMINS);
         if (!canView) {
            return res.status(403).json({ error: 'Acesso não permitido.' });
         }
      }

      const user = await User.findByPk(id, {
         attributes: { exclude: ['password', 'refreshToken'] },
      });

      if (!user) {
         return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      return res.status(200).json({ data: user });
   }),

   /**
    * PUT /users/:id — atualiza um usuário. Tem várias camadas de regra:
    * - "self" pode mudar os próprios dados básicos (nome, e-mail, senha).
    * - Mudar role/permissões de OUTRO exige MANAGE_ADMINS.
    * - Ativar/desativar OUTRO exige MANAGE_ORGANIZERS (desativar também revoga a
    *   sessão, zerando o refreshToken).
    * - O super-admin só pode ser editado por ele mesmo.
    * A atualização é parcial: só aplica os campos enviados.
    */
   update: asyncHandler(async (req, res) => {
      const { id } = req.params;
      const { name, email, password, role, permissions, isActive } = req.body;

      const target = await User.findByPk(id);
      if (!target) {
         return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      const isSelf = req.userId === parseInt(id);
      const requester = isSelf ? target : await User.findByPk(req.userId);

      // Permissões do solicitante sobre o alvo
      const canManageOrganizers = userCan(requester, PERMISSIONS.MANAGE_ORGANIZERS);
      const canManageAdmins = userCan(requester, PERMISSIONS.MANAGE_ADMINS);

      // Editar admin exige manage_admins; editar organizador exige manage_organizers
      if (!isSelf) {
         const allowed = target.role === 'admin' ? canManageAdmins : canManageOrganizers;
         if (!allowed) {
            return res.status(403).json({ error: 'Acesso não permitido.' });
         }
      }

      // Proteção do super-admin: ninguém além dele próprio mexe nos seus dados
      if (target.isSuperAdmin && !isSelf) {
         return res.status(403).json({ error: 'Não é permitido alterar a conta do proprietário do sistema.' });
      }

      // Verifica e-mail duplicado
      if (email && email !== target.email) {
         const emailExists = await User.findOne({ where: { email } });
         if (emailExists) {
            return res.status(409).json({ error: 'Este e-mail já está em uso.' });
         }
      }

      const updatedData = {};
      if (name) updatedData.name = name;
      if (email) updatedData.email = email;
      if (password) updatedData.password = await bcrypt.hash(password, 10);

      // Alteração de role/permissões: somente quem gerencia admins (não em si mesmo)
      if (!isSelf && canManageAdmins) {
         if (role === 'admin' || role === 'user') {
            updatedData.role = role;
         }
         if (permissions !== undefined) {
            const finalRole = updatedData.role ?? target.role;
            updatedData.permissions = finalRole === 'admin' ? sanitizePermissions(permissions) : [];
         }
      }

      // Ativar/desativar: quem gerencia organizadores (não em si mesmo)
      if (!isSelf && typeof isActive === 'boolean' && canManageOrganizers) {
         updatedData.isActive = isActive;
         // Ao desativar, revoga a sessão ativa
         if (isActive === false) updatedData.refreshToken = null;
      }

      await target.update(updatedData);

      return res.status(200).json({ message: 'Usuário atualizado com sucesso', data: publicUser(target) });
   }),

   /**
    * DELETE /users/:id — exclui um usuário e, em cascata, seus campeonatos.
    * Permitido para "self" ou admin com MANAGE_ORGANIZERS. O super-admin é
    * inexcluível. Tudo roda dentro de UMA transação: apaga cada campeonato do
    * usuário (com deleteTournamentCascade) e depois o próprio usuário; se algo
    * falhar, o rollback desfaz tudo.
    */
   delete: asyncHandler(async (req, res) => {
      const { id } = req.params;

      const target = await User.findByPk(id);
      if (!target) {
         return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      const isSelf = req.userId === parseInt(id);
      if (!isSelf) {
         const requester = await User.findByPk(req.userId);
         if (!userCan(requester, PERMISSIONS.MANAGE_ORGANIZERS)) {
            return res.status(403).json({ error: 'Acesso não permitido.' });
         }
      }

      // O super-admin não pode ser excluído
      if (target.isSuperAdmin) {
         return res.status(403).json({ error: 'Não é permitido excluir a conta do proprietário do sistema.' });
      }

      const sequelize = User.sequelize;
      const t = await sequelize.transaction();
      try {
         const tournaments = await target.getTournaments({ attributes: ['id'], transaction: t });
         for (const tournament of tournaments) {
            await deleteTournamentCascade(tournament.id, t);
         }
         await target.destroy({ transaction: t });
         await t.commit();
      } catch (err) {
         await t.rollback();
         throw err;
      }

      return res.status(200).json({ message: 'Usuário excluído com sucesso.' });
   }),

   /**
    * GET /users/permissions — devolve o catálogo de permissões disponíveis.
    * Usado pela tela de gestão de admins para montar a lista de checkboxes.
    */
   permissions: asyncHandler(async (req, res) => {
      return res.status(200).json({ data: ALL_PERMISSIONS });
   }),
};
