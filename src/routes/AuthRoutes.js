/*
 * ============================================================================
 * Rotas de autenticação (montadas sob o prefixo /auth em server.js).
 *
 * O QUE É UM "router": um mini-aplicativo do Express que agrupa rotas de um
 * mesmo assunto. Cada rota liga um VERBO HTTP + um CAMINHO a uma função do
 * controller, opcionalmente passando middlewares ANTES dela. Os middlewares
 * rodam na ordem em que aparecem, da esquerda para a direita.
 *
 * Ex.: router.post('/login', loginLimiter, AuthController.login)
 *      → quando chega POST /auth/login, roda o loginLimiter e, se passar,
 *        chama AuthController.login.
 * ============================================================================
 */
const express = require('express');
const router = express.Router();
const { rateLimit } = require('express-rate-limit');
const authMiddleware = require('../middleware/auth');

const AuthController = require('../controllers/AuthController');

// Limite restritivo para login: protege contra força bruta de senha.
// Só conta tentativas que falham — logins bem-sucedidos não gastam o limite.
const loginLimiter = rateLimit({
   windowMs: 15 * 60 * 1000, // 15 minutos
   max: 10, // 10 tentativas falhas por IP por janela
   standardHeaders: true,
   legacyHeaders: false,
   skipSuccessfulRequests: true,
   message: { error: 'Muitas tentativas de login. Tente novamente em alguns minutos.' },
});

// Limite mais brando para o refresh (evita abuso sem atrapalhar o uso normal).
const refreshLimiter = rateLimit({
   windowMs: 15 * 60 * 1000,
   max: 60,
   standardHeaders: true,
   legacyHeaders: false,
});

// POST /auth/login  → valida credenciais e abre a sessão (pública, com limite).
router.post('/login', loginLimiter, AuthController.login);
// POST /auth/refresh → renova o access token via cookie (pública, sem authMiddleware:
// a identidade é provada pelo próprio refresh token).
router.post('/refresh', refreshLimiter, AuthController.refresh);
// POST /auth/logout → encerra a sessão (exige estar autenticado).
router.post('/logout', authMiddleware, AuthController.logout);

module.exports = router;
