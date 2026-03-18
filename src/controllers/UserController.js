const { User } = require('../database/models');
const bcrypt = require('bcrypt');

module.exports = {
   // Criar usuário (auto-cadastro) - Público
   async register(req, res) {
      try {
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
         });

         const userResponse = user.toJSON();
         delete userResponse.password;

         return res.status(201).json({ message: 'Usuário criado com sucesso', data: userResponse });
      } catch (error) {
         console.error('Erro ao criar usuário:', error);
         return res.status(500).json({ error: 'Erro interno do servidor.' });
      }
   },

   // Criar usuário como admin - Apenas admin
   async create(req, res) {
      try {
         const { name, email, password, role } = req.body;

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
            role: role || 'user', // Permite que admin defina a role
         });

         const userResponse = user.toJSON();
         delete userResponse.password;

         return res.status(201).json({ message: 'Usuário criado com sucesso', data: userResponse });
      } catch (error) {
         console.error('Erro ao criar usuário:', error);
         return res.status(500).json({ error: 'Erro interno do servidor.' });
      }
   },

   // Buscar todos os usuários - Apenas admin
   async findAll(req, res) {
      try {
         // Verifica se é admin
         if (req.userRole !== 'admin') {
            return res.status(403).json({ error: 'Acesso não permitido. Apenas administradores podem listar usuários.' });
         }

         const users = await User.findAll({
            attributes: { exclude: ['password', 'refreshToken'] },
         });

         return res.status(200).json({ data: users });
      } catch (error) {
         console.error('Erro ao buscar usuários:', error);
         return res.status(500).json({ error: 'Erro interno do servidor.' });
      }
   },

   // Buscar usuário por ID
   async findById(req, res) {
      try {
         const { id } = req.params;

         // Verifica permissão: admin vê qualquer, usuário comum só vê próprio
         if (req.userRole !== 'admin' && req.userId !== parseInt(id)) {
            return res.status(403).json({ error: 'Acesso não permitido.' });
         }

         const user = await User.findByPk(id, {
            attributes: { exclude: ['password', 'refreshToken'] },
         });

         if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
         }

         return res.status(200).json({ data: user });
      } catch (error) {
         console.error('Erro ao buscar usuário:', error);
         return res.status(500).json({ error: 'Erro interno do servidor.' });
      }
   },

   // Atualizar usuário
   async update(req, res) {
      try {
         const { id } = req.params;
         const { name, email, password, role } = req.body;

         // Verifica permissão: admin edita qualquer, usuário comum só edita próprio
         if (req.userRole !== 'admin' && req.userId !== parseInt(id)) {
            return res.status(403).json({ error: 'Acesso não permitido.' });
         }

         const user = await User.findByPk(id);
         if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
         }

         // Verifica se o e-mail já existe para outro usuário
         if (email && email !== user.email) {
            const emailExists = await User.findOne({ where: { email } });
            if (emailExists) {
               return res.status(409).json({ error: 'Este e-mail já está em uso.' });
            }
         }

         // Prepara dados para atualização
         const updatedData = {};
         if (name) updatedData.name = name;
         if (email) updatedData.email = email;
         if (password) {
            updatedData.password = await bcrypt.hash(password, 10);
         }

         // Apenas admin pode alterar role
         if (role && req.userRole === 'admin') {
            updatedData.role = role;
         }

         await user.update(updatedData);

         const userResponse = user.toJSON();
         delete userResponse.password;
         delete userResponse.refreshToken;

         return res.status(200).json({ message: 'Usuário atualizado com sucesso', data: userResponse });
      } catch (error) {
         console.error('Erro ao atualizar usuário:', error);
         return res.status(500).json({ error: 'Erro interno do servidor.' });
      }
   },

   // Excluir usuário
   async delete(req, res) {
      try {
         const { id } = req.params;

         // Verifica permissão: admin exclui qualquer, usuário comum só exclui próprio
         if (req.userRole !== 'admin' && req.userId !== parseInt(id)) {
            return res.status(403).json({ error: 'Acesso não permitido.' });
         }

         const user = await User.findByPk(id);
         if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
         }

         await user.destroy();

         return res.status(200).json({ message: 'Usuário excluído com sucesso.' });
      } catch (error) {
         console.error('Erro ao excluir usuário:', error);
         return res.status(500).json({ error: 'Erro interno do servidor.' });
      }
   },
};
