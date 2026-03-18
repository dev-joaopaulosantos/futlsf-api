'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
   async up(queryInterface, Sequelize) {
      await queryInterface.createTable('groups', {
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
         name: {
            type: Sequelize.STRING,
            allowNull: false,
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
      await queryInterface.dropTable('groups');
   },
};
