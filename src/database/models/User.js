'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
   class User extends Model {
      static associate(models) {
         // Relacionamento 1:N -> Um usuário tem vários campeonatos
         User.hasMany(models.Tournament, { foreignKey: 'userId', as: 'tournaments' });
      }
   }
   User.init(
      {
         name: { type: DataTypes.STRING, allowNull: false },
         email: { type: DataTypes.STRING, allowNull: false, unique: true },
         password: { type: DataTypes.STRING, allowNull: false },
         refreshToken: { type: DataTypes.STRING, allowNull: true },
         role: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'user' },
      },
      { sequelize, modelName: 'User', tableName: 'users', underscored: true },
   );
   return User;
};
