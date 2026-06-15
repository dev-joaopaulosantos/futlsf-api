const { User, Tournament } = require('../database/models');
const { userCan, PERMISSIONS } = require('../constants/permissions');

/**
 * Decide se o solicitante pode gerenciar um campeonato (e seus recursos
 * aninhados — fases, grupos, partidas). Dono sempre pode; os demais precisam da
 * permissão MANAGE_TOURNAMENTS. Lê o usuário do banco via `userCan`, respeitando
 * role/isActive — não confia no `role` do token.
 *
 * @param {import('express').Request} req - precisa de `req.userId` (e opcionalmente `req.user`).
 * @param {object} tournament - instância do campeonato (usa `tournament.userId`).
 * @returns {Promise<boolean>}
 */
async function canManageTournament(req, tournament) {
   if (!tournament) return false;
   if (tournament.userId === req.userId) return true;
   const user = req.user ?? (await User.findByPk(req.userId));
   return userCan(user, PERMISSIONS.MANAGE_TOURNAMENTS);
}

/**
 * Igual a {@link canManageTournament}, mas busca o campeonato pelo id antes de
 * delegar. Retorna false se o campeonato não existir.
 * @param {import('express').Request} req
 * @param {number} tournamentId
 * @returns {Promise<boolean>}
 */
async function canManageTournamentById(req, tournamentId) {
   const tournament = await Tournament.findByPk(tournamentId);
   return canManageTournament(req, tournament);
}

module.exports = { canManageTournament, canManageTournamentById };
