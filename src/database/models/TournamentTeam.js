'use strict';
const { Model } = require('sequelize');

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
