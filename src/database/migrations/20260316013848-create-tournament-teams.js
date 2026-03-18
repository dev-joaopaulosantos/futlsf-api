'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
   async up(queryInterface, Sequelize) {
      await queryInterface.createTable('tournament_teams', {
         id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
         },
         tournament_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'tournaments', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
         },
         team_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'teams', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
         },
         group_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'groups', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL', // Se o grupo for deletado, o time volta a ficar sem grupo, mas não sai do campeonato
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
      await queryInterface.dropTable('tournament_teams');
   },
};
