const { Team, Tournament, TournamentTeam } = require('../database/models');

module.exports = {
   // Criar time - usa userId do token
   async create(req, res) {
      try {
         const { name, logoUrl } = req.body;

         if (!name) {
            return res.status(400).json({ error: 'Nome é obrigatório.' });
         }

         const team = await Team.create({
            name,
            logoUrl,
            userId: req.userId, // Usa o userId do token
         });

         const teamResponse = team.toJSON();

         return res.status(201).json({ message: 'Time criado com sucesso', data: teamResponse });
      } catch (error) {
         console.error('Erro ao criar time:', error);
         return res.status(500).json({ error: 'Erro interno do servidor.' });
      }
   },

   // Buscar todos os times
   async findAll(_, res) {
      try {
         const teams = await Team.findAll({
            include: [
               { model: Tournament, as: 'tournaments' },
            ],
         });

         return res.status(200).json({ data: teams });
      } catch (error) {
         console.error('Erro ao buscar times:', error);
         return res.status(500).json({ error: 'Erro interno do servidor.' });
      }
   },

   // Buscar time por ID
   async findById(req, res) {
      try {
         const { id } = req.params;

         const team = await Team.findByPk(id, {
            include: [
               { model: Tournament, as: 'tournaments' },
            ],
         });

         if (!team) {
            return res.status(404).json({ error: 'Time não encontrado.' });
         }

         return res.status(200).json({ data: team });
      } catch (error) {
         console.error('Erro ao buscar time:', error);
         return res.status(500).json({ error: 'Erro interno do servidor.' });
      }
   },

   // Atualizar time - verifica ownership ou admin
   async update(req, res) {
      try {
         const { id } = req.params;
         const { name, logoUrl } = req.body;

         const team = await Team.findByPk(id);
         if (!team) {
            return res.status(404).json({ error: 'Time não encontrado.' });
         }

         // Verifica se é admin ou dono do time
         if (req.userRole !== 'admin' && team.userId !== req.userId) {
            return res.status(403).json({ error: 'Acesso não permitido. Apenas o proprietário pode editar este time.' });
         }

         // Prepara dados para atualização
         const updatedData = {};
         if (name) updatedData.name = name;
         if (logoUrl !== undefined) updatedData.logoUrl = logoUrl;

         await team.update(updatedData);

         const teamResponse = team.toJSON();

         return res.status(200).json({ message: 'Time atualizado com sucesso', data: teamResponse });
      } catch (error) {
         console.error('Erro ao atualizar time:', error);
         return res.status(500).json({ error: 'Erro interno do servidor.' });
      }
   },

   // Excluir time - verifica ownership ou admin
   async delete(req, res) {
      try {
         const { id } = req.params;

         const team = await Team.findByPk(id);
         if (!team) {
            return res.status(404).json({ error: 'Time não encontrado.' });
         }

         // Verifica se é admin ou dono do time
         if (req.userRole !== 'admin' && team.userId !== req.userId) {
            return res.status(403).json({ error: 'Acesso não permitido. Apenas o proprietário pode excluir este time.' });
         }

         await team.destroy();

         return res.status(200).json({ message: 'Time excluído com sucesso.' });
      } catch (error) {
         console.error('Erro ao excluir time:', error);
         return res.status(500).json({ error: 'Erro interno do servidor.' });
      }
   },

   // Associar time a um campeonato
   async assignToTournament(req, res) {
      try {
         const { teamId } = req.params;
         const { tournamentId, groupId } = req.body;

         if (!tournamentId) {
            return res.status(400).json({ error: 'tournamentId é obrigatório.' });
         }

         // Verifica se o time existe
         const team = await Team.findByPk(teamId);
         if (!team) {
            return res.status(404).json({ error: 'Time não encontrado.' });
         }

         // Verifica permissão: admin ou dono do time
         if (req.userRole !== 'admin' && team.userId !== req.userId) {
            return res.status(403).json({ error: 'Acesso não permitido.' });
         }

         // Verifica se já existe associação
         const existingAssociation = await TournamentTeam.findOne({
            where: { teamId, tournamentId },
         });

         if (existingAssociation) {
            return res.status(409).json({ error: 'Time já está associado a este campeonato.' });
         }

         // Cria a associação
         const association = await TournamentTeam.create({
            teamId,
            tournamentId,
            groupId: groupId || null,
         });

         return res.status(201).json({
            message: 'Time associado ao campeonato com sucesso',
            data: association,
         });
      } catch (error) {
         console.error('Erro ao associar time ao campeonato:', error);
         return res.status(500).json({ error: 'Erro interno do servidor.' });
      }
   },

   // Desassociar time de um campeonato
   async removeFromTournament(req, res) {
      try {
         const { teamId, tournamentId } = req.params;

         const team = await Team.findByPk(teamId);
         if (!team) {
            return res.status(404).json({ error: 'Time não encontrado.' });
         }

         // Verifica permissão: admin ou dono do time
         if (req.userRole !== 'admin' && team.userId !== req.userId) {
            return res.status(403).json({ error: 'Acesso não permitido.' });
         }

         const association = await TournamentTeam.findOne({
            where: { teamId, tournamentId },
         });

         if (!association) {
            return res.status(404).json({ error: 'Associação não encontrada.' });
         }

         await association.destroy();

         return res.status(200).json({ message: 'Time desassociado do campeonato com sucesso.' });
      } catch (error) {
         console.error('Erro ao desassociar time do campeonato:', error);
         return res.status(500).json({ error: 'Erro interno do servidor.' });
      }
   },

   // Listar campeonatos de um time
   async getTournaments(req, res) {
      try {
         const { teamId } = req.params;

         const team = await Team.findByPk(teamId, {
            include: [{ model: Tournament, as: 'tournaments' }],
         });

         if (!team) {
            return res.status(404).json({ error: 'Time não encontrado.' });
         }

         return res.status(200).json({ data: team.tournaments });
      } catch (error) {
         console.error('Erro ao buscar campeonatos do time:', error);
         return res.status(500).json({ error: 'Erro interno do servidor.' });
      }
   },
};
