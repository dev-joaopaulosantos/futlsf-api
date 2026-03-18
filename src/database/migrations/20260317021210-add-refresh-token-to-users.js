'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'refresh_token', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'password',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'refresh_token');
  }
};
