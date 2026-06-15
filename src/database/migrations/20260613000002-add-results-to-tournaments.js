'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
   async up(queryInterface, Sequelize) {
      const teamFk = {
         type: Sequelize.INTEGER,
         allowNull: true,
         references: { model: 'teams', key: 'id' },
         onUpdate: 'CASCADE',
         onDelete: 'SET NULL',
      };

      await queryInterface.addColumn('tournaments', 'organizer_name', {
         type: Sequelize.STRING,
         allowNull: true,
      });
      await queryInterface.addColumn('tournaments', 'status', {
         type: Sequelize.ENUM('NOT_STARTED', 'ONGOING', 'FINISHED', 'CANCELLED'),
         allowNull: false,
         defaultValue: 'NOT_STARTED',
      });

      await queryInterface.addColumn('tournaments', 'champion_id', teamFk);
      await queryInterface.addColumn('tournaments', 'runner_up_id', teamFk);
      await queryInterface.addColumn('tournaments', 'third_place_id', teamFk);

      await queryInterface.addColumn('tournaments', 'top_scorer_name', {
         type: Sequelize.STRING,
         allowNull: true,
      });
      await queryInterface.addColumn('tournaments', 'top_scorer_team_id', teamFk);

      await queryInterface.addColumn('tournaments', 'best_player_name', {
         type: Sequelize.STRING,
         allowNull: true,
      });
      await queryInterface.addColumn('tournaments', 'best_player_team_id', teamFk);

      await queryInterface.addColumn('tournaments', 'best_goalkeeper_name', {
         type: Sequelize.STRING,
         allowNull: true,
      });
      await queryInterface.addColumn('tournaments', 'best_goalkeeper_team_id', teamFk);

      await queryInterface.addColumn('tournaments', 'awards', {
         type: Sequelize.JSON,
         allowNull: true,
      });
   },

   async down(queryInterface) {
      const cols = [
         'organizer_name', 'status', 'champion_id', 'runner_up_id', 'third_place_id',
         'top_scorer_name', 'top_scorer_team_id', 'best_player_name', 'best_player_team_id',
         'best_goalkeeper_name', 'best_goalkeeper_team_id', 'awards',
      ];
      for (const col of cols) {
         await queryInterface.removeColumn('tournaments', col);
      }
   },
};
