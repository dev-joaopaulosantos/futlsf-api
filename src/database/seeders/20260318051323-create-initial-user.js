'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
   async up(queryInterface) {
      await queryInterface.bulkInsert(
         'users',
         [
            {
               name: 'Administrador',
               email: 'admin@futlsf.com',
               password: '$2b$10$q0TXGCnqid7zXLL.9dSMFOQseCs.FGvDn7MNkZ9P5dd2Qi/EdFnB6', //admin123 - ⚠️ Trocar via painel admin após o primeiro deploy em produção.
               role: 'admin',
               is_super_admin: true,
               created_at: new Date(),
               updated_at: new Date(),
            },
         ],
         {},
      );
   },

   async down(queryInterface) {
      await queryInterface.bulkDelete('users', null, {});
   },
};
