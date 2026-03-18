const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

const TeamController = require('../controllers/TeamController');

// Rotas públicas
router.post('/create', TeamController.create);

// Rotas protegidas (requer autenticação)
router.get('/get/', authMiddleware, TeamController.findAll);
router.get('/get/:id', authMiddleware, TeamController.findById);
router.put('/update/:id', authMiddleware, TeamController.update);
router.delete('/delete/:id', authMiddleware, TeamController.delete);

// Rotas para relacionamento com campeonatos
router.post('/:teamId/tournaments', authMiddleware, TeamController.assignToTournament);
router.delete('/:teamId/tournaments/:tournamentId', authMiddleware, TeamController.removeFromTournament);
router.get('/:teamId/tournaments', authMiddleware, TeamController.getTournaments);

module.exports = router;
