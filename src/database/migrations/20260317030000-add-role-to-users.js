'use strict';

module.exports = {
   up: async (queryInterface, Sequelize) => {
      await queryInterface.addColumn('users', 'role', {
         type: Sequelize.STRING(20),
         allowNull: false,
         defaultValue: 'user',
         after: 'password'
      });
   },

   down: async (queryInterface) => {
      await queryInterface.removeColumn('users', 'role');
   },
};
