'use strict';
const { Model } = require('sequelize');

/*
 * Model Tournament — representa a tabela `tournaments` (os campeonatos).
 * É o "centro" do domínio: pertence a um organizador (User), tem várias fases,
 * vários times (relação N:M via tabela pivô TournamentTeam) e guarda o resultado
 * final (campeão, vice, artilheiro etc.). Veja os tipos de relacionamento
 * comentados em `associate` abaixo.
 */
module.exports = (sequelize, DataTypes) => {
   class Tournament extends Model {
      static associate(models) {
         // Relacionamento N:1 -> O campeonato pertence a um usuário
         Tournament.belongsTo(models.User, { foreignKey: 'userId', as: 'organizer' });

         // Relacionamento 1:N -> O campeonato tem várias fases
         Tournament.hasMany(models.Phase, { foreignKey: 'tournamentId', as: 'phases' });

         // Relacionamento N:M -> O campeonato tem vários times (através da tabela pivô)
         Tournament.belongsToMany(models.Team, {
            through: models.TournamentTeam,
            foreignKey: 'tournamentId',
            as: 'teams',
         });

         // Pódio e premiações por time (cada um aponta para um Team)
         Tournament.belongsTo(models.Team, { foreignKey: 'championId', as: 'champion' });
         Tournament.belongsTo(models.Team, { foreignKey: 'runnerUpId', as: 'runnerUp' });
         Tournament.belongsTo(models.Team, { foreignKey: 'thirdPlaceId', as: 'thirdPlace' });
         Tournament.belongsTo(models.Team, { foreignKey: 'topScorerTeamId', as: 'topScorerTeam' });
         Tournament.belongsTo(models.Team, { foreignKey: 'bestPlayerTeamId', as: 'bestPlayerTeam' });
         Tournament.belongsTo(models.Team, { foreignKey: 'bestGoalkeeperTeamId', as: 'bestGoalkeeperTeam' });
      }
   }
   Tournament.init(
      {
         name: { type: DataTypes.STRING, allowNull: false },
         description: DataTypes.TEXT,
         logoUrl: DataTypes.STRING, // No banco ficará logo_url
         userId: DataTypes.INTEGER, // No banco ficará user_id
         organizerName: DataTypes.STRING,
         status: {
            type: DataTypes.ENUM('NOT_STARTED', 'ONGOING', 'FINISHED', 'CANCELLED'),
            defaultValue: 'NOT_STARTED',
         },
         championId: DataTypes.INTEGER,
         runnerUpId: DataTypes.INTEGER,
         thirdPlaceId: DataTypes.INTEGER,
         topScorerName: DataTypes.STRING,
         topScorerTeamId: DataTypes.INTEGER,
         bestPlayerName: DataTypes.STRING,
         bestPlayerTeamId: DataTypes.INTEGER,
         bestGoalkeeperName: DataTypes.STRING,
         bestGoalkeeperTeamId: DataTypes.INTEGER,
         awards: DataTypes.JSON, // Lista de { title, prize }
      },
      { sequelize, modelName: 'Tournament', tableName: 'tournaments', underscored: true },
   );
   return Tournament;
};
