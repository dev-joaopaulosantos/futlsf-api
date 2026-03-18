'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('teams', 'user_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      after: 'logo_url'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('teams', 'user_id');
  },
};
