const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const UserController = require('../controllers/UserController');

// Rotas públicas
router.post('/register', UserController.register); // Auto-cadastro
router.post('/create', authMiddleware, authorize(['admin']), UserController.create); // Admin cria usuário

// Rotas protegidas (requer autenticação)
router.get('/get/', authMiddleware, authorize(['admin']), UserController.findAll);
router.get('/get/:id', authMiddleware, UserController.findById);
router.put('/update/:id', authMiddleware, UserController.update);
router.delete('/delete/:id', authMiddleware, UserController.delete);

module.exports = router;
