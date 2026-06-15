/*
 * Rotas de partidas/jogos (prefixo /matches). CRUD REST padrão (ver
 * TournamentRoutes.js). Leitura pública; criar/editar/excluir exigem
 * autenticação (atualizar é usado, p.ex., para registrar o placar).
 */
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const MatchController = require('../controllers/MatchController');

router.post('/', authMiddleware, MatchController.create);
router.get('/', MatchController.findAll);
router.get('/:id', MatchController.findById);
router.put('/:id', authMiddleware, MatchController.update);
router.delete('/:id', authMiddleware, MatchController.delete);

module.exports = router;
