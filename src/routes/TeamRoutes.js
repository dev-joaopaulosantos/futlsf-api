/*
 * Rotas de times (prefixo /teams). Segue o mesmo padrão REST de CRUD descrito
 * em TournamentRoutes.js, com rotas aninhadas para a relação time↔campeonato.
 * Aqui todas exigem autenticação (até a leitura), pois é área de gestão.
 * `/upload-url` gera uma URL temporária para enviar o escudo do time (ver
 * TeamController + lib/supabase.js).
 */
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

const TeamController = require('../controllers/TeamController');

router.post('/', authMiddleware, TeamController.create);
router.get('/', authMiddleware, TeamController.findAll);
router.post('/upload-url', authMiddleware, TeamController.getUploadUrl);
router.get('/:id', authMiddleware, TeamController.findById);
router.put('/:id', authMiddleware, TeamController.update);
router.delete('/:id', authMiddleware, TeamController.delete);

// Rotas para relacionamento com campeonatos
router.post('/:teamId/tournaments', authMiddleware, TeamController.assignToTournament);
router.delete('/:teamId/tournaments/:tournamentId', authMiddleware, TeamController.removeFromTournament);
router.get('/:teamId/tournaments', authMiddleware, TeamController.getTournaments);

module.exports = router;
