'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
   class Team extends Model {
      static associate(models) {
         // Relacionamento N:1 -> Um time pertence a um usuário
         Team.belongsTo(models.User, { foreignKey: 'userId', as: 'owner' });

         // Relacionamento N:M -> Um time pode participar de vários campeonatos
         Team.belongsToMany(models.Tournament, {
            through: models.TournamentTeam,
            foreignKey: 'teamId',
            as: 'tournaments',
         });

         // Relacionamentos 1:N -> Um time joga várias partidas como mandante ou visitante
         Team.hasMany(models.Match, { foreignKey: 'homeTeamId', as: 'home_matches' });
         Team.hasMany(models.Match, { foreignKey: 'awayTeamId', as: 'away_matches' });
      }
   }
   Team.init(
      {
         name: { type: DataTypes.STRING, allowNull: false },
         logoUrl: DataTypes.STRING,
         userId: { type: DataTypes.INTEGER, allowNull: false },
      },
      { sequelize, modelName: 'Team', tableName: 'teams', underscored: true },
   );
   return Team;
};
