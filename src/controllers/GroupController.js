/*
 * ============================================================================
 * GroupController — CRUD dos grupos + cálculo da classificação (standings).
 *
 * Grupo é filho de Fase, que é filha de Campeonato. Para autorizar, subimos a
 * "árvore" até o campeonato: por isso os includes aninhados
 * (group → phase → tournament) antes de chamar `canManageTournament`.
 * ============================================================================
 */
const { Group, Phase, Tournament, TournamentTeam, Team, Match } = require('../database/models');
const { canManageTournament } = require('../services/canManageTournament');
const asyncHandler = require('../middleware/asyncHandler');

module.exports = {
   /**
    * POST /groups — cria um grupo dentro de uma fase. Regra de negócio: só faz
    * sentido em fases LEAGUE (pontos corridos), então mata-mata é barrado com
    * 422 (entidade não processável). Só dono/admin do campeonato pode criar.
    */
   create: asyncHandler(async (req, res) => {
      const { phaseId, name } = req.body;

      if (!phaseId || !name) {
         return res.status(400).json({ error: 'phaseId e name são obrigatórios.' });
      }

      const phase = await Phase.findByPk(phaseId, {
         include: [{ model: Tournament, as: 'tournament' }],
      });

      if (!phase) {
         return res.status(404).json({ error: 'Fase não encontrada.' });
      }

      if (phase.type !== 'LEAGUE') {
         return res.status(422).json({ error: 'Grupos só podem ser criados em fases do tipo LEAGUE.' });
      }

      if (!(await canManageTournament(req, phase.tournament))) {
         return res.status(403).json({ error: 'Acesso não permitido.' });
      }

      const group = await Group.create({ phaseId, name });

      return res.status(201).json({ message: 'Grupo criado com sucesso', data: group });
   }),

   /**
    * GET /groups — lista grupos (pública). Aceita ?phaseId=X para filtrar por
    * fase. Traz os times do grupo via `members` (tabela pivô) + dados do time.
    */
   findAll: asyncHandler(async (req, res) => {
      const { phaseId } = req.query;

      const where = phaseId ? { phaseId } : {};

      const groups = await Group.findAll({
         where,
         include: [
            {
               model: TournamentTeam,
               as: 'members',
               include: [{ model: Team, as: 'team' }],
            },
         ],
      });

      return res.status(200).json({ data: groups });
   }),

   /**
    * GET /groups/:id — busca um grupo com seus times (pública).
    */
   findById: asyncHandler(async (req, res) => {
      const { id } = req.params;

      const group = await Group.findByPk(id, {
         include: [
            {
               model: TournamentTeam,
               as: 'members',
               include: [{ model: Team, as: 'team' }],
            },
         ],
      });

      if (!group) {
         return res.status(404).json({ error: 'Grupo não encontrado.' });
      }

      return res.status(200).json({ data: group });
   }),

   /**
    * PUT /groups/:id — renomeia o grupo (dono/admin do campeonato).
    */
   update: asyncHandler(async (req, res) => {
      const { id } = req.params;
      const { name } = req.body;

      const group = await Group.findByPk(id, {
         include: [{ model: Phase, as: 'phase', include: [{ model: Tournament, as: 'tournament' }] }],
      });

      if (!group) {
         return res.status(404).json({ error: 'Grupo não encontrado.' });
      }

      if (!(await canManageTournament(req, group.phase.tournament))) {
         return res.status(403).json({ error: 'Acesso não permitido.' });
      }

      if (!name) {
         return res.status(400).json({ error: 'name é obrigatório.' });
      }

      await group.update({ name });

      return res.status(200).json({ message: 'Grupo atualizado com sucesso', data: group });
   }),

   /**
    * DELETE /groups/:id — exclui o grupo (dono/admin do campeonato).
    */
   delete: asyncHandler(async (req, res) => {
      const { id } = req.params;

      const group = await Group.findByPk(id, {
         include: [{ model: Phase, as: 'phase', include: [{ model: Tournament, as: 'tournament' }] }],
      });

      if (!group) {
         return res.status(404).json({ error: 'Grupo não encontrado.' });
      }

      if (!(await canManageTournament(req, group.phase.tournament))) {
         return res.status(403).json({ error: 'Acesso não permitido.' });
      }

      await group.destroy();

      return res.status(200).json({ message: 'Grupo excluído com sucesso.' });
   }),

   /**
    * GET /groups/:id/standings — calcula a TABELA DE CLASSIFICAÇÃO do grupo.
    *
    * Não é um CRUD: aqui processamos os jogos e devolvemos a tabela já pronta.
    * Como funciona o cálculo:
    * 1. Pega só as partidas ENCERRADAS do grupo (jogos agendados não pontuam).
    * 2. Cria uma linha zerada para cada time do grupo (para todos aparecerem,
    *    mesmo sem ter jogado): P=pontos, J=jogos, V/E/D, GP=gols pró, GC=gols contra.
    * 3. Para cada jogo, soma gols e distribui pontos (vitória=3, empate=1).
    * 4. Ordena pelos critérios do futebol: pontos → vitórias → saldo de gols →
    *    gols pró → nome (desempate final só para a ordem ficar estável).
    */
   getStandings: asyncHandler(async (req, res) => {
      const { id } = req.params;

      const group = await Group.findByPk(id, {
         include: [
            {
               model: TournamentTeam,
               as: 'members',
               include: [{ model: Team, as: 'team' }],
            },
         ],
      });

      if (!group) {
         return res.status(404).json({ error: 'Grupo não encontrado.' });
      }

      // Só partidas encerradas contam pontos; jogos agendados são ignorados.
      const matches = await Match.findAll({
         where: { groupId: id, status: 'FINISHED' },
      });

      // Mapa teamId -> linha da tabela. Inicia todos os membros do grupo zerados
      // para que apareçam na classificação mesmo sem jogos disputados.
      // P=pontos, J=jogos, V=vitórias, E=empates, D=derrotas, GP=gols pró, GC=gols contra.
      const standings = {};
      for (const member of group.members) {
         standings[member.teamId] = {
            team: member.team,
            P: 0, J: 0, V: 0, E: 0, D: 0, GP: 0, GC: 0,
         };
      }

      for (const match of matches) {
         const home = standings[match.homeTeamId];
         const away = standings[match.awayTeamId];

         if (!home || !away) continue;

         home.J++;
         away.J++;
         home.GP += match.homeScore;
         home.GC += match.awayScore;
         away.GP += match.awayScore;
         away.GC += match.homeScore;

         if (match.homeScore > match.awayScore) {
            home.V++;
            home.P += 3;
            away.D++;
         } else if (match.homeScore < match.awayScore) {
            away.V++;
            away.P += 3;
            home.D++;
         } else {
            home.E++;
            home.P += 1;
            away.E++;
            away.P += 1;
         }
      }

      // Ordena pelos critérios de desempate padrão do futebol, em ordem:
      // pontos → vitórias → saldo de gols (SG) → gols pró; nome como último
      // critério só para manter ordem estável quando tudo empata.
      const table = Object.values(standings)
         .map(s => ({ ...s, SG: s.GP - s.GC }))
         .sort((a, b) => {
            if (b.P !== a.P) return b.P - a.P;
            if (b.V !== a.V) return b.V - a.V;
            if (b.SG !== a.SG) return b.SG - a.SG;
            if (b.GP !== a.GP) return b.GP - a.GP;
            return a.team.name.localeCompare(b.team.name);
         });

      return res.status(200).json({ data: table });
   }),
};
