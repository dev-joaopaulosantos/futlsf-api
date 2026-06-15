'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
   async up(queryInterface, Sequelize) {
      await queryInterface.addColumn('users', 'permissions', {
         type: Sequelize.JSON,
         allowNull: true,
      });
      await queryInterface.addColumn('users', 'is_active', {
         type: Sequelize.BOOLEAN,
         allowNull: false,
         defaultValue: true,
      });
      await queryInterface.addColumn('users', 'is_super_admin', {
         type: Sequelize.BOOLEAN,
         allowNull: false,
         defaultValue: false,
      });

      // Garante que todos os usuários existentes fiquem ativos e com lista vazia
      await queryInterface.sequelize.query(
         "UPDATE users SET is_active = true, permissions = '[]' WHERE permissions IS NULL",
      );

      // Caso já exista um usuario com admin@futlsf.com cadastrado no banco antes dessa migration rodar, garante que esse
      // usuario seja setado como super admin - o usuario com admin@futlsf.com é criado via seed.
      // NÃO remover: migrations já aplicadas não devem ser editadas, e este UPDATE
      // é a única forma de corrigir bancos antigos sem criar uma nova migration.
      await queryInterface.sequelize.query(
         "UPDATE users SET is_super_admin = true, is_active = true WHERE email = 'admin@futlsf.com'",
      );
   },

   async down(queryInterface) {
      await queryInterface.removeColumn('users', 'permissions');
      await queryInterface.removeColumn('users', 'is_active');
      await queryInterface.removeColumn('users', 'is_super_admin');
   },
};
