const { Tournament, Team, TournamentTeam, User } = require('../database/models');

module.exports = {
   // Criar campeonato - usa userId do token, não do body
   async create(req, res) {
      try {
         const { name, description, logoUrl } = req.body;

         if (!name) {
            return res.status(400).json({ error: 'Nome é obrigatório.' });
         }

         const tournament = await Tournament.create({
            name,
            description,
            logoUrl,
            userId: req.userId, // Usa o userId do token
         });

         const tournamentResponse = tournament.toJSON();

         return res.status(201).json({ message: 'Campeonato criado com sucesso', data: tournamentResponse });
      } catch (error) {
         console.error('Erro ao criar campeonato:', error);
         return res.status(500).json({ error: 'Erro interno do servidor.' });
      }
   },

   // Buscar todos os campeonatos
   async findAll(_, res) {
      try {
         const tournaments = await Tournament.findAll({
            include: [
               { model: Team, as: 'teams' },
               { model: User, as: 'organizer', attributes: ['id', 'name', 'email'] },
            ],
         });

         return res.status(200).json({ data: tournaments });
      } catch (error) {
         console.error('Erro ao buscar campeonatos:', error);
         return res.status(500).json({ error: 'Erro interno do servidor.' });
      }
   },

   // Buscar campeonato por ID
   async findById(req, res) {
      try {
         const { id } = req.params;

         const tournament = await Tournament.findByPk(id, {
            include: [
               { model: Team, as: 'teams' },
               { model: User, as: 'organizer', attributes: ['id', 'name', 'email'] },
            ],
         });

         if (!tournament) {
            return res.status(404).json({ error: 'Campeonato não encontrado.' });
         }

         return res.status(200).json({ data: tournament });
      } catch (error) {
         console.error('Erro ao buscar campeonato:', error);
         return res.status(500).json({ error: 'Erro interno do servidor.' });
      }
   },

   // Atualizar campeonato - verifica ownership ou admin
   async update(req, res) {
      try {
         const { id } = req.params;
         const { name, description, logoUrl } = req.body;

         const tournament = await Tournament.findByPk(id);
         if (!tournament) {
            return res.status(404).json({ error: 'Campeonato não encontrado.' });
         }

         // Verifica se é admin ou dono do campeonato
         if (req.userRole !== 'admin' && tournament.userId !== req.userId) {
            return res.status(403).json({ error: 'Acesso não permitido. Apenas o organizador pode editar este campeonato.' });
         }

         // Prepara dados para atualização
         const updatedData = {};
         if (name) updatedData.name = name;
         if (description !== undefined) updatedData.description = description;
         if (logoUrl !== undefined) updatedData.logoUrl = logoUrl;

         await tournament.update(updatedData);

         const tournamentResponse = tournament.toJSON();

         return res.status(200).json({ message: 'Campeonato atualizado com sucesso', data: tournamentResponse });
      } catch (error) {
         console.error('Erro ao atualizar campeonato:', error);
         return res.status(500).json({ error: 'Erro interno do servidor.' });
      }
   },

   // Excluir campeonato - verifica ownership ou admin
   async delete(req, res) {
      try {
         const { id } = req.params;

         const tournament = await Tournament.findByPk(id);
         if (!tournament) {
            return res.status(404).json({ error: 'Campeonato não encontrado.' });
         }

         // Verifica se é admin ou dono do campeonato
         if (req.userRole !== 'admin' && tournament.userId !== req.userId) {
            return res.status(403).json({ error: 'Acesso não permitido. Apenas o organizador pode excluir este campeonato.' });
         }

         await tournament.destroy();

         return res.status(200).json({ message: 'Campeonato excluído com sucesso.' });
      } catch (error) {
         console.error('Erro ao excluir campeonato:', error);
         return res.status(500).json({ error: 'Erro interno do servidor.' });
      }
   },

   // Adicionar time ao campeonato
   async addTeam(req, res) {
      try {
         const { tournamentId } = req.params;
         const { teamId, groupId } = req.body;

         if (!teamId) {
            return res.status(400).json({ error: 'teamId é obrigatório.' });
         }

         // Verifica se o campeonato existe
         const tournament = await Tournament.findByPk(tournamentId);
         if (!tournament) {
            return res.status(404).json({ error: 'Campeonato não encontrado.' });
         }

         // Verifica permissão: admin ou dono do campeonato
         if (req.userRole !== 'admin' && tournament.userId !== req.userId) {
            return res.status(403).json({ error: 'Acesso não permitido.' });
         }

         // Verifica se o time já está associado ao campeonato
         const existingAssociation = await TournamentTeam.findOne({
            where: { tournamentId, teamId },
         });

         if (existingAssociation) {
            return res.status(409).json({ error: 'Time já está associado a este campeonato.' });
         }

         // Cria a associação na tabela pivô
         const association = await TournamentTeam.create({
            tournamentId,
            teamId,
            groupId: groupId || null,
         });

         return res.status(201).json({
            message: 'Time adicionado ao campeonato com sucesso',
            data: association,
         });
      } catch (error) {
         console.error('Erro ao adicionar time ao campeonato:', error);
         return res.status(500).json({ error: 'Erro interno do servidor.' });
      }
   },

   // Remover time do campeonato
   async removeTeam(req, res) {
      try {
         const { tournamentId, teamId } = req.params;

         const tournament = await Tournament.findByPk(tournamentId);
         if (!tournament) {
            return res.status(404).json({ error: 'Campeonato não encontrado.' });
         }

         // Verifica permissão: admin ou dono do campeonato
         if (req.userRole !== 'admin' && tournament.userId !== req.userId) {
            return res.status(403).json({ error: 'Acesso não permitido.' });
         }

         const association = await TournamentTeam.findOne({
            where: { tournamentId, teamId },
         });

         if (!association) {
            return res.status(404).json({ error: 'Associação não encontrada.' });
         }

         await association.destroy();

         return res.status(200).json({ message: 'Time removido do campeonato com sucesso.' });
      } catch (error) {
         console.error('Erro ao remover time do campeonato:', error);
         return res.status(500).json({ error: 'Erro interno do servidor.' });
      }
   },

   // Listar times de um campeonato
   async getTeams(req, res) {
      try {
         const { tournamentId } = req.params;

         const tournament = await Tournament.findByPk(tournamentId, {
            include: [{ model: Team, as: 'teams' }],
         });

         if (!tournament) {
            return res.status(404).json({ error: 'Campeonato não encontrado.' });
         }

         return res.status(200).json({ data: tournament.teams });
      } catch (error) {
         console.error('Erro ao buscar times do campeonato:', error);
         return res.status(500).json({ error: 'Erro interno do servidor.' });
      }
   },
};
