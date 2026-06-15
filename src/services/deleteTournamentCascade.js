const { Tournament, TournamentTeam, Group, Phase, Match } = require('../database/models');

/**
 * Apaga um campeonato e todos os seus dados dependentes em ordem segura,
 * respeitando as foreign keys: primeiro os filhos das fases (partidas e grupos),
 * depois os vínculos de times, então as fases e por fim o próprio campeonato.
 *
 * POR QUE A ORDEM IMPORTA: o banco não deixa apagar um "pai" que ainda tem
 * "filhos" apontando para ele (chave estrangeira / foreign key). Então apagamos
 * de baixo para cima: partidas/grupos → vínculos de times → fases → campeonato.
 *
 * O QUE É UMA TRANSAÇÃO (transaction): um conjunto de operações no banco que
 * acontece "tudo ou nada". Se qualquer passo falhar, o `rollback` desfaz TODOS
 * os anteriores, evitando deixar o banco pela metade (ex.: fases apagadas mas
 * campeonato ainda existindo). Se tudo der certo, o `commit` confirma de vez.
 *
 * @param {number} tournamentId - ID do campeonato a remover.
 * @param {import('sequelize').Transaction} [externalTransaction] - Transação a
 *   reutilizar (ex.: ao excluir um usuário com vários campeonatos). Quando
 *   omitida, a função abre e finaliza (commit/rollback) a própria transação.
 */
async function deleteTournamentCascade(tournamentId, externalTransaction) {
   const sequelize = Tournament.sequelize;
   const t = externalTransaction ?? (await sequelize.transaction());

   try {
      const phases = await Phase.findAll({
         where: { tournamentId },
         attributes: ['id'],
         transaction: t,
      });
      const phaseIds = phases.map((p) => p.id);

      if (phaseIds.length > 0) {
         await Match.destroy({ where: { phaseId: phaseIds }, transaction: t });
         await Group.destroy({ where: { phaseId: phaseIds }, transaction: t });
      }

      await TournamentTeam.destroy({ where: { tournamentId }, transaction: t });
      await Phase.destroy({ where: { tournamentId }, transaction: t });
      await Tournament.destroy({ where: { id: tournamentId }, transaction: t });

      if (!externalTransaction) await t.commit();
   } catch (error) {
      if (!externalTransaction) await t.rollback();
      throw error;
   }
}

module.exports = deleteTournamentCascade;
