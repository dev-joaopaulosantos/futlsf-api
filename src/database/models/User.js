'use strict';
const { Model } = require('sequelize');

/*
 * Model User — representa a tabela `users`.
 *
 * Cada model exporta uma função que recebe `sequelize` e `DataTypes` e devolve a
 * classe. Dois pontos para entender o padrão:
 * - `static associate(models)`: declara os relacionamentos com outras tabelas;
 *   é chamado pelo index.js depois de todos os models carregarem.
 * - `User.init({...campos...}, {...opções...})`: define as colunas e suas regras
 *   (tipo, obrigatório, valor padrão, único...). `underscored: true` faz o
 *   Sequelize converter os nomes camelCase do JS (ex.: isActive) para snake_case
 *   no banco (ex.: is_active).
 */
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
         // Nulo para quem entra só via Google (a senha vive na conta Google, não aqui)
         password: { type: DataTypes.STRING, allowNull: true },
         // ID da conta Google (campo `sub` do token). Nulo para contas de e-mail/senha.
         googleId: { type: DataTypes.STRING, allowNull: true, unique: true },
         refreshToken: { type: DataTypes.STRING, allowNull: true },
         role: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'user' },
         // Lista de chaves de permissão (apenas relevante para admins). Ver src/constants/permissions.js
         permissions: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
         // Conta desativada não consegue logar nem renovar token
         isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
         // Proprietário do sistema: todas as permissões, protegido contra alterações de terceiros
         isSuperAdmin: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      },
      { sequelize, modelName: 'User', tableName: 'users', underscored: true },
   );
   return User;
};
