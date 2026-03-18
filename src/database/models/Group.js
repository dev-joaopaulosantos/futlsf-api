'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
   class Group extends Model {
      static associate(models) {
         // Pertence a uma fase específica
         Group.belongsTo(models.Phase, { foreignKey: 'phaseId', as: 'phase' });

         // Um grupo tem vários times alocados a ele (olhando para a tabela pivô)
         Group.hasMany(models.TournamentTeam, { foreignKey: 'groupId', as: 'members' });

         // Um grupo tem vários jogos
         Group.hasMany(models.Match, { foreignKey: 'groupId', as: 'matches' });
      }
   }
   Group.init(
      {
         name: { type: DataTypes.STRING, allowNull: false },
         phaseId: DataTypes.INTEGER,
      },
      { sequelize, modelName: 'Group', tableName: 'groups', underscored: true },
   );
   return Group;
};
