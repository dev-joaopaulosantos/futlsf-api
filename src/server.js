require('dotenv').config();
const express = require('express');

// Importando Routes
const UserRoutes = require('./routes/UserRoutes');
const AuthRoutes = require('./routes/AuthRoutes');
const TournamentRoutes = require('./routes/TournamentRoutes');
const TeamRoutes = require('./routes/TeamRoutes');

const app = express();

// Config resposta JSON
app.use(express.json());

app.get('/', (_, res) => {
   res.status(200).json({ message: 'API em funcionamento' });
});

// Routes
app.use('/auth', AuthRoutes);
app.use('/users', UserRoutes);
app.use('/tournaments', TournamentRoutes);
app.use('/teams', TeamRoutes);

// Iniciando o servidor
app.listen(process.env.PORT, () => {
   console.log('Servidor rodando na porta:', process.env.PORT);
});
