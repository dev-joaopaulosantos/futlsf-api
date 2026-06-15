'use strict';
const { Model } = require('sequelize');

/*
 * Model TournamentTeam — TABELA PIVÔ (ou "de junção") entre campeonatos e times.
 *
 * POR QUE EXISTE: a relação entre Tournament e Team é N:M (muitos-para-muitos):
 * um campeonato tem vários times e um time pode estar em vários campeonatos.
 * Bancos relacionais não guardam N:M direto numa coluna; resolvemos com uma
 * tabela no meio, onde cada linha representa "este time participa deste
 * campeonato". Aqui ela também guarda `groupId` (em qual grupo o time ficou).
 */
module.exports = (sequelize, DataTypes) => {
   class TournamentTeam extends Model {
      static associate(models) {
         // Associações diretas para facilitar queries complexas depois
         TournamentTeam.belongsTo(models.Tournament, { foreignKey: 'tournamentId' });
         TournamentTeam.belongsTo(models.Team, { foreignKey: 'teamId', as: 'team' });
         TournamentTeam.belongsTo(models.Group, { foreignKey: 'groupId', as: 'group' });
      }
   }
   TournamentTeam.init(
      {
         // O ID primário foi adicionado na migration, útil para manipulações diretas
         id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
         tournamentId: DataTypes.INTEGER,
         teamId: DataTypes.INTEGER,
         groupId: DataTypes.INTEGER,
      },
      { sequelize, modelName: 'TournamentTeam', tableName: 'tournament_teams', underscored: true },
   );
   return TournamentTeam;
};
