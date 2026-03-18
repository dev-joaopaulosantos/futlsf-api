'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
   async up(queryInterface, Sequelize) {
      await queryInterface.createTable('matches', {
         id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
         },
         phase_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'phases', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
         },
         group_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'groups', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
         },
         home_team_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'teams', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
         },
         away_team_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'teams', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
         },
         home_score: {
            type: Sequelize.INTEGER,
            allowNull: true, // Começa nulo (jogo agendado)
         },
         away_score: {
            type: Sequelize.INTEGER,
            allowNull: true, // Começa nulo (jogo agendado)
         },
         status: {
            type: Sequelize.ENUM('SCHEDULED', 'FINISHED'),
            allowNull: false,
            defaultValue: 'SCHEDULED',
         },
         match_date: {
            type: Sequelize.DATE,
            allowNull: true,
         },
         created_at: {
            allowNull: false,
            type: Sequelize.DATE,
         },
         updated_at: {
            allowNull: false,
            type: Sequelize.DATE,
         },
      });
   },

   async down(queryInterface) {
      await queryInterface.dropTable('matches');
   },
};
