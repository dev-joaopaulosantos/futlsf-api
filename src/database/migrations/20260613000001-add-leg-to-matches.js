'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
   async up(queryInterface, Sequelize) {
      await queryInterface.addColumn('matches', 'leg', {
         type: Sequelize.ENUM('SINGLE', 'FIRST_LEG', 'SECOND_LEG'),
         allowNull: false,
         defaultValue: 'SINGLE',
      });
   },

   async down(queryInterface) {
      await queryInterface.removeColumn('matches', 'leg');
   },
};
