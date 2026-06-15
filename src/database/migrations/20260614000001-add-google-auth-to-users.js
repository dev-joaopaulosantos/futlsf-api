'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
   async up(queryInterface, Sequelize) {
      // ID da conta Google (o campo `sub` do token). Único para impedir que duas
      // contas do sistema apontem para a mesma conta Google. Nulo para quem só
      // usa e-mail/senha.
      await queryInterface.addColumn('users', 'google_id', {
         type: Sequelize.STRING,
         allowNull: true,
         unique: true,
      });

      // Usuários que entram só pelo Google não têm senha no nosso banco, então a
      // coluna passa a aceitar NULL (antes era obrigatória).
      await queryInterface.changeColumn('users', 'password', {
         type: Sequelize.STRING,
         allowNull: true,
      });
   },

   async down(queryInterface, Sequelize) {
      await queryInterface.removeColumn('users', 'google_id');

      // Reverte a senha para obrigatória. Atenção: se existirem usuários só-Google
      // (password nulo), este rollback pode falhar — seria preciso tratá-los antes.
      await queryInterface.changeColumn('users', 'password', {
         type: Sequelize.STRING,
         allowNull: false,
      });
   },
};
