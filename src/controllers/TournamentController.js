/*
 * ============================================================================
 * TournamentController — regras de negócio das rotas de campeonatos.
 *
 * O QUE É UM CONTROLLER: é a função que recebe a requisição (req), executa a
 * lógica (validar dados, falar com o banco via models) e devolve a resposta
 * (res). As rotas (TournamentRoutes.js) apenas apontam para estes métodos.
 *
 * PADRÃO DO PROJETO:
 * - Cada método é embrulhado em `asyncHandler` → não precisamos de try/catch;
 *   erros inesperados sobem para o errorHandler central (ver middleware/).
 * - Erros ESPERADOS (validação, não encontrado, sem permissão) retornam um
 *   status 4xx com `{ error: '...' }`.
 * - Autorização para mexer num campeonato usa `canManageTournament` (dono ou
 *   admin com permissão), NÃO o role cru do token.
 * ============================================================================
 */
const { Tournament, Team, TournamentTeam, User, Group, Phase } = require('../database/models');
const { userCan, PERMISSIONS } = require('../constants/permissions');
const deleteTournamentCascade = require('../services/deleteTournamentCascade');
const { canManageTournament } = require('../services/canManageTournament');
const { TOURNAMENT_STATUSES } = require('../constants/enums');
const asyncHandler = require('../middleware/asyncHandler');
const supabase = require('../lib/supabase');

// Configurações do upload de logo para o Supabase Storage.
const LOGO_BUCKET = 'tournament-logos';
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

// "Includes" de exibição reutilizados em findAll/findById. No Sequelize, um
// `include` faz um JOIN: além do campeonato, já traz os dados relacionados
// (times, organizador, pódio...) numa só consulta. `attributes` limita quais
// colunas vêm — ex.: do organizador expomos só id/name (sem e-mail/dados pessoais).
const teamAttrs = ['id', 'name', 'logoUrl'];
const displayIncludes = [
   { model: Team, as: 'teams' },
   // Endpoint público: expõe só id/name do organizador (sem e-mail/PII).
   { model: User, as: 'organizer', attributes: ['id', 'name'] },
   { model: Team, as: 'champion', attributes: teamAttrs },
   { model: Team, as: 'runnerUp', attributes: teamAttrs },
   { model: Team, as: 'thirdPlace', attributes: teamAttrs },
   { model: Team, as: 'topScorerTeam', attributes: teamAttrs },
   { model: Team, as: 'bestPlayerTeam', attributes: teamAttrs },
   { model: Team, as: 'bestGoalkeeperTeam', attributes: teamAttrs },
];

module.exports = {
   /**
    * POST /tournaments — cria um campeonato.
    * O dono é definido pelo `req.userId` (vindo do token), e NÃO por algo do
    * corpo, para o usuário não conseguir criar campeonato "em nome de outro".
    */
   create: asyncHandler(async (req, res) => {
      const { name, description, logoUrl, organizerName } = req.body;

      if (!name) {
         return res.status(400).json({ error: 'Nome é obrigatório.' });
      }

      const tournament = await Tournament.create({
         name,
         description,
         logoUrl,
         organizerName,
         userId: req.userId, // Usa o userId do token
      });

      const tournamentResponse = tournament.toJSON();

      return res.status(201).json({ message: 'Campeonato criado com sucesso', data: tournamentResponse });
   }),

   /**
    * GET /tournaments — lista todos os campeonatos (rota pública).
    * Usa `displayIncludes` para já trazer times, organizador e pódio juntos.
    */
   findAll: asyncHandler(async (_, res) => {
      const tournaments = await Tournament.findAll({
         include: displayIncludes,
      });

      return res.status(200).json({ data: tournaments });
   }),

   /**
    * GET /tournaments/:id — busca um campeonato pelo id (rota pública).
    * `findByPk` = "find by primary key" (busca pela chave primária). Responde
    * 404 se não existir.
    */
   findById: asyncHandler(async (req, res) => {
      const { id } = req.params;

      const tournament = await Tournament.findByPk(id, {
         include: displayIncludes,
      });

      if (!tournament) {
         return res.status(404).json({ error: 'Campeonato não encontrado.' });
      }

      return res.status(200).json({ data: tournament });
   }),

   /**
    * PUT /tournaments/:id — atualiza um campeonato (inclui registrar o pódio).
    * Só o dono ou um admin com permissão pode editar (canManageTournament).
    * Faz uma "atualização parcial": monta `updatedData` apenas com os campos que
    * vieram no corpo (value !== undefined), preservando os demais como estavam.
    */
   update: asyncHandler(async (req, res) => {
      const { id } = req.params;
      const {
         name, description, logoUrl, organizerName, status,
         championId, runnerUpId, thirdPlaceId,
         topScorerName, topScorerTeamId,
         bestPlayerName, bestPlayerTeamId,
         bestGoalkeeperName, bestGoalkeeperTeamId,
         awards,
      } = req.body;

      const tournament = await Tournament.findByPk(id);
      if (!tournament) {
         return res.status(404).json({ error: 'Campeonato não encontrado.' });
      }

      // Verifica se é admin ou dono do campeonato
      if (!(await canManageTournament(req, tournament))) {
         return res.status(403).json({ error: 'Acesso não permitido. Apenas o organizador pode editar este campeonato.' });
      }

      if (status && !TOURNAMENT_STATUSES.includes(status)) {
         return res.status(400).json({ error: 'status inválido.' });
      }

      // Prepara dados para atualização (só aplica campos enviados)
      const updatedData = {};
      const fields = {
         name, description, logoUrl, organizerName, status,
         championId, runnerUpId, thirdPlaceId,
         topScorerName, topScorerTeamId,
         bestPlayerName, bestPlayerTeamId,
         bestGoalkeeperName, bestGoalkeeperTeamId,
         awards,
      };
      for (const [key, value] of Object.entries(fields)) {
         if (value !== undefined) updatedData[key] = value;
      }
      // name não pode ser vazio
      if (updatedData.name === '') delete updatedData.name;

      await tournament.update(updatedData);

      const tournamentResponse = tournament.toJSON();

      return res.status(200).json({ message: 'Campeonato atualizado com sucesso', data: tournamentResponse });
   }),

   /**
    * DELETE /tournaments/:id — exclui um campeonato e tudo que depende dele.
    * Usa `deleteTournamentCascade` para apagar fases, grupos, partidas e
    * vínculos na ordem certa, dentro de uma transação. Só dono/admin pode.
    */
   delete: asyncHandler(async (req, res) => {
      const { id } = req.params;

      const tournament = await Tournament.findByPk(id);
      if (!tournament) {
         return res.status(404).json({ error: 'Campeonato não encontrado.' });
      }

      // Verifica se pode gerenciar campeonatos de terceiros ou é o dono
      const canManage = await canManageTournament(req, tournament);
      if (!canManage) {
         return res.status(403).json({ error: 'Acesso não permitido. Apenas o organizador pode excluir este campeonato.' });
      }

      await deleteTournamentCascade(tournament.id);

      return res.status(200).json({ message: 'Campeonato excluído com sucesso.' });
   }),

   /**
    * POST /tournaments/:tournamentId/teams — inscreve um time no campeonato.
    * Cria uma linha na tabela pivô TournamentTeam. Valida: campeonato existe,
    * quem chama pode gerenciá-lo, o time existe e pertence ao organizador (ou
    * quem chama é admin com MANAGE_TOURNAMENTS), e o time ainda não está inscrito
    * (409 = conflito/duplicado).
    */
   addTeam: asyncHandler(async (req, res) => {
      const { tournamentId } = req.params;
      const { teamId, groupId } = req.body;

      if (!teamId) {
         return res.status(400).json({ error: 'teamId é obrigatório.' });
      }

      // Verifica se o campeonato existe
      const tournament = await Tournament.findByPk(tournamentId);
      if (!tournament) {
         return res.status(404).json({ error: 'Campeonato não encontrado.' });
      }

      // Verifica permissão: admin ou dono do campeonato
      if (!(await canManageTournament(req, tournament))) {
         return res.status(403).json({ error: 'Acesso não permitido.' });
      }

      // Valida que o time pertence ao organizador do campeonato (ou admin com manage_tournaments)
      const team = await Team.findByPk(teamId);
      if (!team) {
         return res.status(404).json({ error: 'Time não encontrado.' });
      }
      if (team.userId !== tournament.userId) {
         const requester = await User.findByPk(req.userId);
         if (!userCan(requester, PERMISSIONS.MANAGE_TOURNAMENTS)) {
            return res.status(403).json({ error: 'Este time não pertence ao organizador deste campeonato.' });
         }
      }

      // Verifica se o time já está associado ao campeonato
      const existingAssociation = await TournamentTeam.findOne({
         where: { tournamentId, teamId },
      });

      if (existingAssociation) {
         return res.status(409).json({ error: 'Time já está associado a este campeonato.' });
      }

      // Cria a associação na tabela pivô
      const association = await TournamentTeam.create({
         tournamentId,
         teamId,
         groupId: groupId || null,
      });

      return res.status(201).json({
         message: 'Time adicionado ao campeonato com sucesso',
         data: association,
      });
   }),

   /**
    * DELETE /tournaments/:tournamentId/teams/:teamId — desinscreve um time.
    * Remove a linha correspondente da tabela pivô TournamentTeam.
    */
   removeTeam: asyncHandler(async (req, res) => {
      const { tournamentId, teamId } = req.params;

      const tournament = await Tournament.findByPk(tournamentId);
      if (!tournament) {
         return res.status(404).json({ error: 'Campeonato não encontrado.' });
      }

      // Verifica permissão: admin ou dono do campeonato
      if (!(await canManageTournament(req, tournament))) {
         return res.status(403).json({ error: 'Acesso não permitido.' });
      }

      const association = await TournamentTeam.findOne({
         where: { tournamentId, teamId },
      });

      if (!association) {
         return res.status(404).json({ error: 'Associação não encontrada.' });
      }

      await association.destroy();

      return res.status(200).json({ message: 'Time removido do campeonato com sucesso.' });
   }),

   /**
    * PUT /tournaments/:tournamentId/teams/:teamId/group — define o grupo do time.
    * Atualiza o `groupId` na linha da tabela pivô. Se um grupo for informado,
    * confere que ele realmente pertence a este campeonato (segurança/coerência).
    * Passar groupId vazio "tira" o time de qualquer grupo (groupId = null).
    */
   assignTeamToGroup: asyncHandler(async (req, res) => {
      const { tournamentId, teamId } = req.params;
      const { groupId } = req.body;

      const tournament = await Tournament.findByPk(tournamentId);
      if (!tournament) {
         return res.status(404).json({ error: 'Campeonato não encontrado.' });
      }

      if (!(await canManageTournament(req, tournament))) {
         return res.status(403).json({ error: 'Acesso não permitido.' });
      }

      const association = await TournamentTeam.findOne({ where: { tournamentId, teamId } });
      if (!association) {
         return res.status(404).json({ error: 'Time não está neste campeonato.' });
      }

      if (groupId) {
         const group = await Group.findByPk(groupId, {
            include: [{ model: Phase, as: 'phase' }],
         });

         if (!group || group.phase.tournamentId !== parseInt(tournamentId)) {
            return res.status(400).json({ error: 'Grupo não pertence a este campeonato.' });
         }
      }

      await association.update({ groupId: groupId || null });

      return res.status(200).json({ message: 'Grupo do time atualizado com sucesso', data: association });
   }),

   /**
    * GET /tournaments/:tournamentId/teams — lista os times do campeonato.
    * Detalhe: o `groupId` mora na tabela pivô (TournamentTeam). Aqui nós o
    * "achatamos" para dentro de cada time, deixando a resposta mais simples para
    * o frontend (cada time já vem com seu groupId direto).
    */
   getTeams: asyncHandler(async (req, res) => {
      const { tournamentId } = req.params;

      const tournament = await Tournament.findByPk(tournamentId, {
         include: [{ model: Team, as: 'teams', through: { attributes: ['groupId'] } }],
      });

      if (!tournament) {
         return res.status(404).json({ error: 'Campeonato não encontrado.' });
      }

      // Achata o groupId do pivô (TournamentTeam) para cada time, para que o
      // frontend consiga refletir o grupo atribuído.
      const teams = tournament.teams.map((team) => {
         const json = team.toJSON();
         const groupId = json.TournamentTeam?.groupId ?? null;
         delete json.TournamentTeam;
         return { ...json, groupId };
      });

      return res.status(200).json({ data: teams });
   }),

   /**
    * POST /tournaments/upload-url — gera URL assinada para upload da logo.
    *
    * Mesmo padrão do `TeamController.getUploadUrl` (ver lá a explicação do
    * "upload direto"). O arquivo vai para o bucket `tournament-logos` no
    * Supabase Storage. Precisa ser criado no painel do Supabase como bucket
    * PÚBLICO (para que a `publicUrl` seja acessível sem autenticação).
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
         .from(LOGO_BUCKET)
         .createSignedUploadUrl(path);

      if (error) {
         console.error('[getUploadUrl tournament] Supabase error:', error);
         return res.status(500).json({ error: 'Erro ao gerar URL de upload.', detail: error.message });
      }

      const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/${LOGO_BUCKET}/${path}`;

      return res.status(200).json({ signedUrl: data.signedUrl, token: data.token, path, publicUrl });
   }),
};
