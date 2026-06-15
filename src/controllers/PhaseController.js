/*
 * ============================================================================
 * PhaseController — CRUD das fases de um campeonato.
 *
 * Como a fase é um recurso "filho" do campeonato, a autorização sempre passa por
 * `canManageTournament(req, tournament)`: para saber se quem chama pode mexer na
 * fase, verificamos se ele pode gerenciar o CAMPEONATO dono dela. Por isso, em
 * update/delete, carregamos a fase já com seu `tournament` (via include).
 * ============================================================================
 */
const { Phase, Tournament, Group, Match } = require('../database/models');
const { canManageTournament } = require('../services/canManageTournament');
const { PHASE_TYPES } = require('../constants/enums');
const asyncHandler = require('../middleware/asyncHandler');

module.exports = {
   /**
    * POST /phases — cria uma fase. Valida campos obrigatórios e o `type`
    * (precisa estar em PHASE_TYPES). Só dono/admin do campeonato pode criar.
    */
   create: asyncHandler(async (req, res) => {
      const { tournamentId, name, type, order } = req.body;

      if (!tournamentId || !name || !type) {
         return res.status(400).json({ error: 'tournamentId, name e type são obrigatórios.' });
      }

      if (!PHASE_TYPES.includes(type)) {
         return res.status(400).json({ error: 'type deve ser LEAGUE ou KNOCKOUT.' });
      }

      const tournament = await Tournament.findByPk(tournamentId);
      if (!tournament) {
         return res.status(404).json({ error: 'Campeonato não encontrado.' });
      }

      if (!(await canManageTournament(req, tournament))) {
         return res.status(403).json({ error: 'Acesso não permitido.' });
      }

      const phase = await Phase.create({ tournamentId, name, type, order: order || 1 });

      return res.status(201).json({ message: 'Fase criada com sucesso', data: phase });
   }),

   /**
    * GET /phases — lista fases (pública). Aceita ?tournamentId=X para filtrar as
    * fases de um campeonato; sem o filtro, retorna todas. Ordena por `order`.
    */
   findAll: asyncHandler(async (req, res) => {
      const { tournamentId } = req.query;

      // Monta o filtro do banco: com tournamentId, restringe; sem ele, traz tudo.
      const where = tournamentId ? { tournamentId } : {};

      const phases = await Phase.findAll({
         where,
         include: [{ model: Group, as: 'groups' }],
         order: [['order', 'ASC']],
      });

      return res.status(200).json({ data: phases });
   }),

   /**
    * GET /phases/:id — busca uma fase com seus grupos e partidas (pública).
    */
   findById: asyncHandler(async (req, res) => {
      const { id } = req.params;

      const phase = await Phase.findByPk(id, {
         include: [
            { model: Group, as: 'groups' },
            { model: Match, as: 'matches' },
         ],
      });

      if (!phase) {
         return res.status(404).json({ error: 'Fase não encontrada.' });
      }

      return res.status(200).json({ data: phase });
   }),

   /**
    * PUT /phases/:id — atualiza uma fase (dono/admin do campeonato). Atualização
    * parcial. Carrega a fase com seu campeonato para checar a permissão.
    */
   update: asyncHandler(async (req, res) => {
      const { id } = req.params;
      const { name, type, order } = req.body;

      const phase = await Phase.findByPk(id, {
         include: [{ model: Tournament, as: 'tournament' }],
      });

      if (!phase) {
         return res.status(404).json({ error: 'Fase não encontrada.' });
      }

      if (!(await canManageTournament(req, phase.tournament))) {
         return res.status(403).json({ error: 'Acesso não permitido.' });
      }

      if (type && !PHASE_TYPES.includes(type)) {
         return res.status(400).json({ error: 'type deve ser LEAGUE ou KNOCKOUT.' });
      }

      const updatedData = {};
      if (name) updatedData.name = name;
      if (type) updatedData.type = type;
      if (order !== undefined) updatedData.order = order;

      await phase.update(updatedData);

      return res.status(200).json({ message: 'Fase atualizada com sucesso', data: phase });
   }),

   /**
    * DELETE /phases/:id — exclui uma fase (dono/admin do campeonato).
    */
   delete: asyncHandler(async (req, res) => {
      const { id } = req.params;

      const phase = await Phase.findByPk(id, {
         include: [{ model: Tournament, as: 'tournament' }],
      });

      if (!phase) {
         return res.status(404).json({ error: 'Fase não encontrada.' });
      }

      if (!(await canManageTournament(req, phase.tournament))) {
         return res.status(403).json({ error: 'Acesso não permitido.' });
      }

      await phase.destroy();

      return res.status(200).json({ message: 'Fase excluída com sucesso.' });
   }),
};
