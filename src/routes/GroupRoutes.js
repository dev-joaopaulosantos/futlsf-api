/*
 * Rotas de grupos (prefixo /groups). CRUD REST padrão (ver TournamentRoutes.js).
 * Além do CRUD, expõe GET /:id/standings, que calcula a CLASSIFICAÇÃO do grupo
 * (pontos, saldo de gols etc.) — uma "sub-rota" de leitura derivada do recurso.
 */
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const GroupController = require('../controllers/GroupController');

router.post('/', authMiddleware, GroupController.create);
router.get('/', GroupController.findAll);
router.get('/:id', GroupController.findById);
router.put('/:id', authMiddleware, GroupController.update);
router.delete('/:id', authMiddleware, GroupController.delete);
router.get('/:id/standings', GroupController.getStandings);

module.exports = router;
