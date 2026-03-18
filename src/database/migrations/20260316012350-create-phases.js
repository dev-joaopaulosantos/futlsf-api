'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
   async up(queryInterface, Sequelize) {
      await queryInterface.createTable('phases', {
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
         name: {
            type: Sequelize.STRING,
            allowNull: false,
         },
         type: {
            type: Sequelize.ENUM('LEAGUE', 'KNOCKOUT'),
            allowNull: false,
         },
         order: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 1,
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
      await queryInterface.dropTable('phases');
   },
};
