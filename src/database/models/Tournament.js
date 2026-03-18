'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
   class Tournament extends Model {
      static associate(models) {
         // Relacionamento N:1 -> O campeonato pertence a um usuário
         Tournament.belongsTo(models.User, { foreignKey: 'userId', as: 'organizer' });

         // Relacionamento 1:N -> O campeonato tem várias fases
         Tournament.hasMany(models.Phase, { foreignKey: 'tournamentId', as: 'phases' });

         // Relacionamento N:M -> O campeonato tem vários times (através da tabela pivô)
         Tournament.belongsToMany(models.Team, {
            through: models.TournamentTeam,
            foreignKey: 'tournamentId',
            as: 'teams',
         });
      }
   }
   Tournament.init(
      {
         name: { type: DataTypes.STRING, allowNull: false },
         description: DataTypes.TEXT,
         logoUrl: DataTypes.STRING, // No banco ficará logo_url
         userId: DataTypes.INTEGER, // No banco ficará user_id
      },
      { sequelize, modelName: 'Tournament', tableName: 'tournaments', underscored: true },
   );
   return Tournament;
};
