'use strict';
/*
 * ============================================================================
 * index.js (models) — inicializa o Sequelize e carrega TODOS os models.
 *
 * O QUE É O SEQUELIZE (ORM): em vez de escrever SQL na mão, descrevemos as
 * tabelas como "models" (classes JS) e o Sequelize traduz para SQL. Cada arquivo
 * nesta pasta (User.js, Team.js, ...) descreve uma tabela.
 *
 * O QUE ESTE ARQUIVO FAZ (foi gerado pelo Sequelize CLI):
 * 1. Cria a conexão `sequelize` usando a config de config/config.js conforme o
 *    ambiente (development/production), lido de NODE_ENV.
 * 2. Lê automaticamente todos os arquivos .js desta pasta (menos este) e
 *    registra cada model em `db` (ex.: db.User, db.Tournament...).
 * 3. Chama o `associate` de cada model para criar os relacionamentos entre eles.
 *
 * No resto do código, usamos: `const { User, Tournament } = require('.../models')`.
 * ============================================================================
 */
require("dotenv").config();

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.js')[env];
const db = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

try {
  console.log("Conexão com o BANCO DE DADOS realizada com sucesso!")
} catch (error) {
  console.error("Erro: Não foi possível fazer a conexão com o BANCO DE DADOS", error)
}

fs
  .readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
