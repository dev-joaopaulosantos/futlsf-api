'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
   class Phase extends Model {
      static associate(models) {
         // Pertence a um campeonato
         Phase.belongsTo(models.Tournament, { foreignKey: 'tournamentId', as: 'tournament' });

         // Pode ter vários grupos
         Phase.hasMany(models.Group, { foreignKey: 'phaseId', as: 'groups' });

         // Tem vários jogos
         Phase.hasMany(models.Match, { foreignKey: 'phaseId', as: 'matches' });
      }
   }
   Phase.init(
      {
         name: { type: DataTypes.STRING, allowNull: false },
         type: { type: DataTypes.ENUM('LEAGUE', 'KNOCKOUT'), allowNull: false },
         order: { type: DataTypes.INTEGER, defaultValue: 1 },
         tournamentId: DataTypes.INTEGER,
      },
      { sequelize, modelName: 'Phase', tableName: 'phases', underscored: true },
   );
   return Phase;
};
