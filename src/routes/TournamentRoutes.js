/*
 * Rotas de campeonatos (prefixo /tournaments).
 *
 * PADRÃO REST: cada recurso (aqui, "tournament") tem um conjunto previsível de
 * operações, escolhidas pelo VERBO HTTP + CAMINHO, em vez de inventar nomes:
 *   POST   /tournaments       → criar         (Create)
 *   GET    /tournaments       → listar todos  (Read)
 *   GET    /tournaments/:id   → ler um        (Read)   :id é um "parâmetro de rota"
 *   PUT    /tournaments/:id   → atualizar     (Update)
 *   DELETE /tournaments/:id   → excluir       (Delete)
 *
 * `:id`, `:tournamentId`, `:teamId` são partes variáveis da URL: o Express as
 * captura e disponibiliza em `req.params` (ex.: req.params.id).
 *
 * Note que GET (leitura pública) NÃO usa authMiddleware, mas criar/editar/excluir
 * SIM — só usuários autenticados podem modificar dados.
 */
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

const TournamentController = require('../controllers/TournamentController');

router.post('/', authMiddleware, TournamentController.create);
router.get('/', TournamentController.findAll);
router.get('/:id', TournamentController.findById);
router.put('/:id', authMiddleware, TournamentController.update);
router.delete('/:id', authMiddleware, TournamentController.delete);

// RECURSOS ANINHADOS: um campeonato "tem" times. Expressamos essa relação na
// própria URL — ex.: DELETE /tournaments/5/teams/8 remove o time 8 do
// campeonato 5. É mais legível e RESTful do que uma rota solta tipo /removeTeam.
router.post('/:tournamentId/teams', authMiddleware, TournamentController.addTeam);
router.delete('/:tournamentId/teams/:teamId', authMiddleware, TournamentController.removeTeam);
router.get('/:tournamentId/teams', TournamentController.getTeams);
router.put('/:tournamentId/teams/:teamId/group', authMiddleware, TournamentController.assignTeamToGroup);

module.exports = router;
