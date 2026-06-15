/*
 * ============================================================================
 * server.js — ponto de entrada da API (monta o app Express e o liga na porta).
 *
 * COMO O EXPRESS PROCESSA UMA REQUISIÇÃO:
 * O Express funciona como uma "fila" de funções (middlewares) executadas NA
 * ORDEM em que são registradas com `app.use(...)`. Cada requisição entra no
 * topo e desce: primeiro os middlewares globais (CORS, cookies, JSON), depois
 * as rotas; e, por último, o tratador de erros. Por isso a ORDEM abaixo importa.
 * ============================================================================
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

// Importando Routes
const UserRoutes = require('./routes/UserRoutes');
const AuthRoutes = require('./routes/AuthRoutes');
const TournamentRoutes = require('./routes/TournamentRoutes');
const TeamRoutes = require('./routes/TeamRoutes');
const PhaseRoutes = require('./routes/PhaseRoutes');
const GroupRoutes = require('./routes/GroupRoutes');
const MatchRoutes = require('./routes/MatchRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Lista de origens (URLs do frontend) autorizadas a chamar a API. Vem do .env,
// separada por vírgula. Usada pelo CORS logo abaixo.
const allowedOrigins = process.env.FRONTEND_URL
   ? process.env.FRONTEND_URL.split(',').map((u) => u.trim())
   : [];

// CORS: o navegador, por segurança, só deixa um site chamar APIs de OUTRA
// origem se a API autorizar. Aqui liberamos apenas as origens conhecidas e
// habilitamos `credentials` para o cookie httpOnly do refresh token trafegar.
app.use(cors({
   origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
   },
   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
   allowedHeaders: ['Content-Type', 'Authorization'],
   credentials: true,
}));
app.use(cookieParser()); // lê cookies da requisição → preenche `req.cookies`
app.use(express.json()); // entende corpo JSON → preenche `req.body`

// Rota de "saúde": permite checar rapidamente se a API está no ar.
app.get('/', (_, res) => {
   res.status(200).json({ message: 'API em funcionamento' });
});

// Montagem das rotas por recurso (padrão REST). Cada `app.use(prefixo, router)`
// significa: "todas as rotas deste arquivo começam com este prefixo". Ex.: o
// `POST /` dentro de TournamentRoutes vira, na prática, `POST /tournaments`.
app.use('/auth', AuthRoutes);
app.use('/users', UserRoutes);
app.use('/tournaments', TournamentRoutes);
app.use('/teams', TeamRoutes);
app.use('/phases', PhaseRoutes);
app.use('/groups', GroupRoutes);
app.use('/matches', MatchRoutes);

// Handler de erro central — captura exceções lançadas pelos controllers
// (via asyncHandler). Por ser o último da fila, recebe os erros de tudo acima.
// Ver explicação detalhada em middleware/errorHandler.js.
app.use(errorHandler);

// Sobe o servidor e fica "escutando" requisições na porta definida no .env.
app.listen(process.env.PORT, () => {
   console.log('Servidor rodando na porta:', process.env.PORT);
});
