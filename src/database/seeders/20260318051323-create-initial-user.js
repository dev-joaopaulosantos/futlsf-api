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
               password: '$2b$10$q0TXGCnqid7zXLL.9dSMFOQseCs.FGvDn7MNkZ9P5dd2Qi/EdFnB6',
            },
         ],
         {},
      );
   },

   async down(queryInterface) {
      await queryInterface.bulkDelete('users', null, {});
   },
};
