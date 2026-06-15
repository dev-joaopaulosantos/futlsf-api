'use strict';
const { Model } = require('sequelize');

/*
 * Model Match — representa a tabela `matches` (as partidas/jogos). Liga dois
 * times (homeTeamId = mandante, awayTeamId = visitante) dentro de uma fase e,
 * opcionalmente, de um grupo. Guarda o placar (homeScore/awayScore), o status
 * (SCHEDULED/FINISHED) e a "perna" do confronto (jogo único, ida ou volta).
 */
module.exports = (sequelize, DataTypes) => {
   class Match extends Model {
      static associate(models) {
         // A qual fase e grupo o jogo pertence
         Match.belongsTo(models.Phase, { foreignKey: 'phaseId', as: 'phase' });
         Match.belongsTo(models.Group, { foreignKey: 'groupId', as: 'group' });

         // Quem está jogando contra quem
         Match.belongsTo(models.Team, { foreignKey: 'homeTeamId', as: 'home_team' });
         Match.belongsTo(models.Team, { foreignKey: 'awayTeamId', as: 'away_team' });
      }
   }
   Match.init(
      {
         homeScore: DataTypes.INTEGER,
         awayScore: DataTypes.INTEGER,
         status: { type: DataTypes.ENUM('SCHEDULED', 'FINISHED'), defaultValue: 'SCHEDULED' },
         leg: { type: DataTypes.ENUM('SINGLE', 'FIRST_LEG', 'SECOND_LEG'), defaultValue: 'SINGLE' },
         matchDate: DataTypes.DATE,
         phaseId: DataTypes.INTEGER,
         groupId: DataTypes.INTEGER,
         homeTeamId: DataTypes.INTEGER,
         awayTeamId: DataTypes.INTEGER,
      },
      { sequelize, modelName: 'Match', tableName: 'matches', underscored: true },
   );
   return Match;
};
