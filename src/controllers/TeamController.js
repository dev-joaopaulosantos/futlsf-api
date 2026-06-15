/*
 * ============================================================================
 * TeamController — CRUD de times, vínculo com campeonatos e upload de escudo.
 *
 * Padrão de autorização recorrente aqui: o DONO do time (team.userId ===
 * req.userId) sempre pode; outras pessoas só se forem admin com a permissão
 * MANAGE_TOURNAMENTS. Esse mesmo bloco se repete em várias ações.
 * ============================================================================
 */
const { Team, Tournament, TournamentTeam, User } = require('../database/models');
const { userCan, PERMISSIONS } = require('../constants/permissions');
const asyncHandler = require('../middleware/asyncHandler');
const supabase = require('../lib/supabase');

// Configurações do upload de escudos (imagens dos times) para o Supabase Storage.
const BUCKET = 'team-logos'; // "pasta" no Storage onde os escudos ficam
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // tamanho máximo: 2 MB

module.exports = {
   /**
    * POST /teams — cria um time. O dono é o usuário do token (req.userId).
    */
   create: asyncHandler(async (req, res) => {
      const { name, logoUrl } = req.body;

      if (!name) {
         return res.status(400).json({ error: 'Nome é obrigatório.' });
      }

      const team = await Team.create({
         name,
         logoUrl,
         userId: req.userId, // Usa o userId do token
      });

      const teamResponse = team.toJSON();

      return res.status(201).json({ message: 'Time criado com sucesso', data: teamResponse });
   }),

   /**
    * GET /teams — lista times. Por padrão, só os do próprio usuário.
    * Admins com VIEW_ALL ou MANAGE_TOURNAMENTS podem passar ?ownerId=X (query
    * string) para ver os times de outro organizador.
    */
   findAll: asyncHandler(async (req, res) => {
      const requester = await User.findByPk(req.userId);
      const canViewOthers = userCan(requester, PERMISSIONS.VIEW_ALL)
         || userCan(requester, PERMISSIONS.MANAGE_TOURNAMENTS);

      const ownerId = canViewOthers && req.query.ownerId
         ? parseInt(req.query.ownerId)
         : req.userId;

      const teams = await Team.findAll({
         where: { userId: ownerId },
         include: [{ model: Tournament, as: 'tournaments' }],
      });

      return res.status(200).json({ data: teams });
   }),

   /**
    * GET /teams/:id — busca um time. Só o dono ou admin com VIEW_ALL/
    * MANAGE_TOURNAMENTS pode ver times de outros.
    */
   findById: asyncHandler(async (req, res) => {
      const { id } = req.params;

      const team = await Team.findByPk(id, {
         include: [{ model: Tournament, as: 'tournaments' }],
      });

      if (!team) {
         return res.status(404).json({ error: 'Time não encontrado.' });
      }

      if (team.userId !== req.userId) {
         const requester = await User.findByPk(req.userId);
         if (!userCan(requester, PERMISSIONS.VIEW_ALL) && !userCan(requester, PERMISSIONS.MANAGE_TOURNAMENTS)) {
            return res.status(403).json({ error: 'Acesso não permitido.' });
         }
      }

      return res.status(200).json({ data: team });
   }),

   /**
    * PUT /teams/:id — atualiza nome/escudo do time (dono ou admin). Atualização
    * parcial: só aplica os campos enviados.
    */
   update: asyncHandler(async (req, res) => {
      const { id } = req.params;
      const { name, logoUrl } = req.body;

      const team = await Team.findByPk(id);
      if (!team) {
         return res.status(404).json({ error: 'Time não encontrado.' });
      }

      // Dono do time pode sempre; admin com manage_tournaments também
      if (team.userId !== req.userId) {
         const requester = await User.findByPk(req.userId);
         if (!userCan(requester, PERMISSIONS.MANAGE_TOURNAMENTS)) {
            return res.status(403).json({ error: 'Acesso não permitido. Apenas o proprietário pode editar este time.' });
         }
      }

      // Prepara dados para atualização
      const updatedData = {};
      if (name) updatedData.name = name;
      if (logoUrl !== undefined) updatedData.logoUrl = logoUrl;

      await team.update(updatedData);

      const teamResponse = team.toJSON();

      return res.status(200).json({ message: 'Time atualizado com sucesso', data: teamResponse });
   }),

   /**
    * DELETE /teams/:id — exclui o time (dono ou admin).
    */
   delete: asyncHandler(async (req, res) => {
      const { id } = req.params;

      const team = await Team.findByPk(id);
      if (!team) {
         return res.status(404).json({ error: 'Time não encontrado.' });
      }

      // Dono do time pode sempre; admin com manage_tournaments também
      if (team.userId !== req.userId) {
         const requester = await User.findByPk(req.userId);
         if (!userCan(requester, PERMISSIONS.MANAGE_TOURNAMENTS)) {
            return res.status(403).json({ error: 'Acesso não permitido. Apenas o proprietário pode excluir este time.' });
         }
      }

      await team.destroy();

      return res.status(200).json({ message: 'Time excluído com sucesso.' });
   }),

   /**
    * POST /teams/:teamId/tournaments — inscreve este time num campeonato.
    * É o "espelho" de TournamentController.addTeam, visto pelo lado do time.
    * Cria a linha na tabela pivô; 409 se já estiver inscrito.
    */
   assignToTournament: asyncHandler(async (req, res) => {
      const { teamId } = req.params;
      const { tournamentId, groupId } = req.body;

      if (!tournamentId) {
         return res.status(400).json({ error: 'tournamentId é obrigatório.' });
      }

      // Verifica se o time existe
      const team = await Team.findByPk(teamId);
      if (!team) {
         return res.status(404).json({ error: 'Time não encontrado.' });
      }

      // Dono do time pode associar; admin com manage_tournaments também
      if (team.userId !== req.userId) {
         const requester = await User.findByPk(req.userId);
         if (!userCan(requester, PERMISSIONS.MANAGE_TOURNAMENTS)) {
            return res.status(403).json({ error: 'Acesso não permitido.' });
         }
      }

      // Verifica se já existe associação
      const existingAssociation = await TournamentTeam.findOne({
         where: { teamId, tournamentId },
      });

      if (existingAssociation) {
         return res.status(409).json({ error: 'Time já está associado a este campeonato.' });
      }

      // Cria a associação
      const association = await TournamentTeam.create({
         teamId,
         tournamentId,
         groupId: groupId || null,
      });

      return res.status(201).json({
         message: 'Time associado ao campeonato com sucesso',
         data: association,
      });
   }),

   /**
    * DELETE /teams/:teamId/tournaments/:tournamentId — tira o time do campeonato.
    */
   removeFromTournament: asyncHandler(async (req, res) => {
      const { teamId, tournamentId } = req.params;

      const team = await Team.findByPk(teamId);
      if (!team) {
         return res.status(404).json({ error: 'Time não encontrado.' });
      }

      // Dono do time pode remover; admin com manage_tournaments também
      if (team.userId !== req.userId) {
         const requester = await User.findByPk(req.userId);
         if (!userCan(requester, PERMISSIONS.MANAGE_TOURNAMENTS)) {
            return res.status(403).json({ error: 'Acesso não permitido.' });
         }
      }

      const association = await TournamentTeam.findOne({
         where: { teamId, tournamentId },
      });

      if (!association) {
         return res.status(404).json({ error: 'Associação não encontrada.' });
      }

      await association.destroy();

      return res.status(200).json({ message: 'Time desassociado do campeonato com sucesso.' });
   }),

   /**
    * POST /teams/upload-url — gera uma URL ASSINADA para upload do escudo.
    *
    * PADRÃO "UPLOAD DIRETO": em vez de o arquivo passar pelo nosso servidor, o
    * backend só gera uma URL temporária e autorizada do Supabase Storage; o
    * frontend então envia a imagem DIRETO para o Supabase usando essa URL. Isso
    * evita sobrecarregar a API com tráfego de arquivos.
    *
    * Antes de gerar, validamos tipo de arquivo (ALLOWED_TYPES) e tamanho
    * (MAX_SIZE_BYTES). O caminho inclui o userId e um timestamp para evitar
    * nomes repetidos. Devolvemos a signedUrl (para enviar) e a publicUrl (para
    * exibir depois).
    */
   getUploadUrl: asyncHandler(async (req, res) => {
      const { fileName, contentType, fileSize } = req.body;

      if (!fileName || !contentType) {
         return res.status(400).json({ error: 'fileName e contentType são obrigatórios.' });
      }

      if (!ALLOWED_TYPES.includes(contentType)) {
         return res.status(400).json({ error: 'Formato não permitido. Use JPG, PNG, WebP ou SVG.' });
      }

      if (fileSize && fileSize > MAX_SIZE_BYTES) {
         return res.status(400).json({ error: 'Arquivo muito grande. Máximo: 2 MB.' });
      }

      const ext = fileName.split('.').pop();
      const path = `${req.userId}/${Date.now()}.${ext}`;

      const { data, error } = await supabase.storage
         .from(BUCKET)
         .createSignedUploadUrl(path);

      if (error) {
         console.error('[getUploadUrl] Supabase error:', error);
         return res.status(500).json({ error: 'Erro ao gerar URL de upload.', detail: error.message });
      }

      const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;

      return res.status(200).json({ signedUrl: data.signedUrl, token: data.token, path, publicUrl });
   }),

   /**
    * GET /teams/:teamId/tournaments — lista os campeonatos de que o time participa.
    */
   getTournaments: asyncHandler(async (req, res) => {
      const { teamId } = req.params;

      const team = await Team.findByPk(teamId, {
         include: [{ model: Tournament, as: 'tournaments' }],
      });

      if (!team) {
         return res.status(404).json({ error: 'Time não encontrado.' });
      }

      return res.status(200).json({ data: team.tournaments });
   }),
};
