'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
   async up(queryInterface, Sequelize) {
      await queryInterface.createTable('tournaments', {
         id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
         },
         user_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
         },
         name: {
            type: Sequelize.STRING,
            allowNull: false,
         },
         description: {
            type: Sequelize.TEXT,
            allowNull: true,
         },
         logo_url: {
            type: Sequelize.STRING,
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
      await queryInterface.dropTable('tournaments');
   },
};
