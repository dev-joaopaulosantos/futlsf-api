const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

const TournamentController = require('../controllers/TournamentController');

// Rotas públicas
router.post('/create', TournamentController.create);

// Rotas protegidas (requer autenticação)
router.get('/get/', authMiddleware, TournamentController.findAll);
router.get('/get/:id', authMiddleware, TournamentController.findById);
router.put('/update/:id', authMiddleware, TournamentController.update);
router.delete('/delete/:id', authMiddleware, TournamentController.delete);

// Rotas para relacionamento com times
router.post('/:tournamentId/teams', authMiddleware, TournamentController.addTeam);
router.delete('/:tournamentId/teams/:teamId', authMiddleware, TournamentController.removeTeam);
router.get('/:tournamentId/teams', authMiddleware, TournamentController.getTeams);

module.exports = router;
