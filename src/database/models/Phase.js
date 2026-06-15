'use strict';
const { Model } = require('sequelize');

/*
 * Model Phase — representa a tabela `phases` (as fases de um campeonato, ex.:
 * "Fase de grupos", "Semifinal"). O campo `type` define o formato: LEAGUE
 * (pontos corridos) ou KNOCKOUT (mata-mata); `order` define a sequência das fases.
 */
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
