/*
 * ============================================================================
 * MatchController — CRUD das partidas (jogos). Atualizar é o que registra placar.
 *
 * Partida pertence a uma fase (e talvez a um grupo). Como sempre, a autorização
 * sobe até o campeonato dono da fase, via `canManageTournament`.
 * ============================================================================
 */
const { Match, Phase, Tournament, Team, Group } = require('../database/models');
const { canManageTournament } = require('../services/canManageTournament');
const { MATCH_STATUSES, MATCH_LEGS } = require('../constants/enums');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * Helper: dado o id de uma fase, retorna a fase JÁ com seu campeonato incluído.
 * Reutilizado em create/update/delete para checar permissão sem repetir código.
 * @param {number} phaseId - id da fase.
 * @returns {Promise<object|null>} a fase com `phase.tournament`, ou null.
 */
async function getTournamentFromPhase(phaseId) {
   const phase = await Phase.findByPk(phaseId, {
      include: [{ model: Tournament, as: 'tournament' }],
   });
   return phase;
}

module.exports = {
   /**
    * POST /matches — cria uma partida. Valida obrigatórios, impede time contra
    * si mesmo e confere `status`/`leg` contra os enums. Só dono/admin do
    * campeonato pode. Campos opcionais entram com valores padrão (ex.: status
    * 'SCHEDULED', leg 'SINGLE').
    */
   create: asyncHandler(async (req, res) => {
      const { phaseId, groupId, homeTeamId, awayTeamId, matchDate, status, homeScore, awayScore, leg } = req.body;

      if (!phaseId || !homeTeamId || !awayTeamId) {
         return res.status(400).json({ error: 'phaseId, homeTeamId e awayTeamId são obrigatórios.' });
      }

      if (homeTeamId === awayTeamId) {
         return res.status(400).json({ error: 'Um time não pode jogar contra si mesmo.' });
      }

      if (status && !MATCH_STATUSES.includes(status)) {
         return res.status(400).json({ error: 'status deve ser SCHEDULED ou FINISHED.' });
      }

      if (leg && !MATCH_LEGS.includes(leg)) {
         return res.status(400).json({ error: 'leg deve ser SINGLE, FIRST_LEG ou SECOND_LEG.' });
      }

      const phase = await getTournamentFromPhase(phaseId);
      if (!phase) {
         return res.status(404).json({ error: 'Fase não encontrada.' });
      }

      if (!(await canManageTournament(req, phase.tournament))) {
         return res.status(403).json({ error: 'Acesso não permitido.' });
      }

      const match = await Match.create({
         phaseId,
         groupId: groupId || null,
         homeTeamId,
         awayTeamId,
         matchDate: matchDate || null,
         status: status || 'SCHEDULED',
         homeScore: homeScore ?? null,
         awayScore: awayScore ?? null,
         leg: leg || 'SINGLE',
      });

      return res.status(201).json({ message: 'Partida criada com sucesso', data: match });
   }),

   /**
    * GET /matches — lista partidas (pública). Aceita os filtros opcionais
    * ?phaseId=X e ?groupId=Y (combináveis). Traz os times e a fase, ordenado
    * por data.
    */
   findAll: asyncHandler(async (req, res) => {
      const { phaseId, groupId } = req.query;

      // Monta o filtro só com o que foi enviado (objeto vazio = sem filtro = tudo).
      const where = {};
      if (phaseId) where.phaseId = phaseId;
      if (groupId) where.groupId = groupId;

      const matches = await Match.findAll({
         where,
         include: [
            { model: Team, as: 'home_team' },
            { model: Team, as: 'away_team' },
            { model: Phase, as: 'phase' },
         ],
         order: [['matchDate', 'ASC']],
      });

      return res.status(200).json({ data: matches });
   }),

   /**
    * GET /matches/:id — busca uma partida com times, fase e grupo (pública).
    */
   findById: asyncHandler(async (req, res) => {
      const { id } = req.params;

      const match = await Match.findByPk(id, {
         include: [
            { model: Team, as: 'home_team' },
            { model: Team, as: 'away_team' },
            { model: Phase, as: 'phase' },
            { model: Group, as: 'group' },
         ],
      });

      if (!match) {
         return res.status(404).json({ error: 'Partida não encontrada.' });
      }

      return res.status(200).json({ data: match });
   }),

   /**
    * PUT /matches/:id — atualiza a partida. É aqui que o placar é registrado
    * (homeScore/awayScore) e o status muda para FINISHED (o que faz o jogo
    * passar a contar na classificação). Atualização parcial; só dono/admin.
    */
   update: asyncHandler(async (req, res) => {
      const { id } = req.params;
      const { homeScore, awayScore, status, matchDate, groupId, leg } = req.body;

      const match = await Match.findByPk(id);
      if (!match) {
         return res.status(404).json({ error: 'Partida não encontrada.' });
      }

      const phase = await getTournamentFromPhase(match.phaseId);
      if (!(await canManageTournament(req, phase.tournament))) {
         return res.status(403).json({ error: 'Acesso não permitido.' });
      }

      if (status && !MATCH_STATUSES.includes(status)) {
         return res.status(400).json({ error: 'status deve ser SCHEDULED ou FINISHED.' });
      }

      if (leg && !MATCH_LEGS.includes(leg)) {
         return res.status(400).json({ error: 'leg deve ser SINGLE, FIRST_LEG ou SECOND_LEG.' });
      }

      const updatedData = {};
      if (homeScore !== undefined) updatedData.homeScore = homeScore;
      if (awayScore !== undefined) updatedData.awayScore = awayScore;
      if (status) updatedData.status = status;
      if (matchDate !== undefined) updatedData.matchDate = matchDate;
      if (groupId !== undefined) updatedData.groupId = groupId;
      if (leg !== undefined) updatedData.leg = leg;

      await match.update(updatedData);

      return res.status(200).json({ message: 'Partida atualizada com sucesso', data: match });
   }),

   /**
    * DELETE /matches/:id — exclui a partida (dono/admin do campeonato).
    */
   delete: asyncHandler(async (req, res) => {
      const { id } = req.params;

      const match = await Match.findByPk(id);
      if (!match) {
         return res.status(404).json({ error: 'Partida não encontrada.' });
      }

      const phase = await getTournamentFromPhase(match.phaseId);
      if (!(await canManageTournament(req, phase.tournament))) {
         return res.status(403).json({ error: 'Acesso não permitido.' });
      }

      await match.destroy();

      return res.status(200).json({ message: 'Partida excluída com sucesso.' });
   }),
};
