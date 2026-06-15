/*
 * Rotas de fases do campeonato (prefixo /phases). CRUD REST padrão (ver
 * TournamentRoutes.js). Leitura (GET) é pública; criar/editar/excluir exigem
 * autenticação. A autorização fina (se PODE mexer naquele campeonato) é feita
 * dentro do controller via canManageTournament.
 */
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const PhaseController = require('../controllers/PhaseController');

router.post('/', authMiddleware, PhaseController.create);
router.get('/', PhaseController.findAll);
router.get('/:id', PhaseController.findById);
router.put('/:id', authMiddleware, PhaseController.update);
router.delete('/:id', authMiddleware, PhaseController.delete);

module.exports = router;
