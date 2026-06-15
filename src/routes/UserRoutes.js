/*
 * Rotas de usuários/admins (prefixo /users).
 *
 * Aqui aparece a cadeia de middlewares mais completa do projeto:
 *   authMiddleware → requirePermission(...) → Controller
 * Ou seja: primeiro confirma QUEM é (autenticação), depois SE PODE (permissão
 * granular) e só então executa a ação. Ver os middlewares em src/middleware/.
 */
const express = require('express');
const router = express.Router();
const { rateLimit } = require('express-rate-limit');
const authMiddleware = require('../middleware/auth');
const requirePermission = require('../middleware/requirePermission');
const { requireAnyPermission } = require('../middleware/requirePermission');
const { PERMISSIONS } = require('../constants/permissions');

const UserController = require('../controllers/UserController');

// Limite para auto-cadastro: evita criação em massa de contas.
const registerLimiter = rateLimit({
   windowMs: 60 * 60 * 1000, // 1 hora
   max: 20,
   standardHeaders: true,
   legacyHeaders: false,
   message: { error: 'Muitas contas criadas a partir deste IP. Tente novamente mais tarde.' },
});

// Rotas públicas
router.post('/register', registerLimiter, UserController.register); // Auto-cadastro (sempre 'user')

// Catálogo de permissões disponíveis (para a tela de gestão de admins)
router.get('/permissions', authMiddleware, requirePermission(PERMISSIONS.MANAGE_ADMINS), UserController.permissions);

// Gestão de usuários/admins
router.post('/', authMiddleware, requirePermission(PERMISSIONS.MANAGE_ADMINS), UserController.create);
router.get(
   '/',
   authMiddleware,
   requireAnyPermission(PERMISSIONS.VIEW_ALL, PERMISSIONS.MANAGE_ORGANIZERS, PERMISSIONS.MANAGE_ADMINS),
   UserController.findAll,
);

// Self ou admin (a lógica de permissão fica no controller)
// Obs.: declarado depois de GET /permissions para que "permissions" não caia em /:id.
router.get('/:id', authMiddleware, UserController.findById);
router.put('/:id', authMiddleware, UserController.update);
router.delete('/:id', authMiddleware, UserController.delete);

module.exports = router;
