require('dotenv').config();
const { User } = require('../database/models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../middleware/asyncHandler');

/*
 * ============================================================================
 * AuthController — Login, renovação de sessão e logout.
 *
 * ESTRATÉGIA DE AUTENTICAÇÃO (dois tokens):
 * Em vez de um único token JWT, usamos DOIS, cada um com um papel:
 *
 * 1) ACCESS TOKEN (curto, ex.: 15 min)
 *    - Vai no corpo da resposta; o frontend guarda em MEMÓRIA (não em
 *      localStorage) e o envia no header `Authorization: Bearer ...`.
 *    - Por ser curto, se vazar, expira rápido.
 *
 * 2) REFRESH TOKEN (longo, ex.: 7 dias)
 *    - Vai num COOKIE httpOnly. "httpOnly" = o JavaScript do navegador NÃO
 *      consegue lê-lo, o que protege contra roubo via XSS. O navegador o envia
 *      sozinho nas requisições (por isso o front usa `withCredentials`).
 *    - Também é salvo no banco (campo `user.refreshToken`), permitindo
 *      INVALIDAR a sessão no servidor (logout / troca de senha).
 *
 * FLUXO: o access token expira → o front chama /auth/refresh → este controller
 * valida o refresh token (assinatura + comparação com o banco) e emite um novo
 * access token. Assim o usuário não precisa logar de novo a cada poucos minutos.
 *
 * Antes (em projetos só com JWT) costuma-se usar um único token longo; o
 * problema é que ele não pode ser revogado e, se vazar, vale por muito tempo.
 * ============================================================================
 */

// Chaves secretas e tempos de expiração, lidos do .env
const { JWT_SECRET, JWT_EXPIRES_IN, REFRESH_TOKEN_SECRET, REFRESH_TOKEN_EXPIRES_IN } = process.env;

/**
 * Monta as opções do cookie do refresh token.
 *
 * Centralizado numa função porque essas flags precisam ser IDÊNTICAS ao criar
 * (`res.cookie`) e ao remover (`res.clearCookie`) o cookie — senão o navegador
 * não reconhece que é o mesmo cookie e não consegue apagá-lo no logout.
 *
 * - httpOnly: invisível para o JavaScript (proteção contra XSS).
 * - secure: só trafega via HTTPS (ligado apenas em produção).
 * - sameSite: controla o envio do cookie entre sites (mitiga CSRF). Em produção
 *   usamos 'strict' (mais seguro); em desenvolvimento 'lax' para facilitar.
 *
 * @returns {{httpOnly: boolean, secure: boolean, sameSite: string}}
 */
function refreshCookieOptions() {
   const isProduction = process.env.NODE_ENV === 'production';
   return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
   };
}

module.exports = {
   /**
    * POST /auth/login — autentica o usuário e abre a sessão.
    *
    * Recebe `email` e `password` no corpo (`req.body`). Se as credenciais forem
    * válidas, gera o par de tokens (ver explicação no topo do arquivo): devolve
    * o access token no JSON e coloca o refresh token num cookie httpOnly.
    *
    * PASSO A PASSO:
    * 1. Valida que e-mail e senha vieram preenchidos.
    * 2. Busca o usuário pelo e-mail.
    * 3. Compara a senha enviada com o HASH salvo usando `bcrypt.compare`
    *    (nunca guardamos a senha em texto puro no banco).
    * 4. Bloqueia contas desativadas.
    * 5. Gera o access token (com id, email e role embutidos) e o refresh token
    *    (só com o id), salvando o refresh no banco.
    * 6. Remove campos sensíveis (senha e refreshToken) antes de responder.
    *
    * Obs.: por segurança, e-mail inexistente e senha errada retornam a MESMA
    * mensagem ("E-mail ou senha inválidos"), para não revelar se o e-mail existe.
    *
    * @param {import('express').Request} req - `req.body` com { email, password }.
    * @param {import('express').Response} res - resposta (JSON + cookie).
    */
   login: asyncHandler(async (req, res) => {
      const { email, password } = req.body;

      if (!email || !password) {
         return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
      }

      // Busca o usuário pelo e-mail
      const user = await User.findOne({ where: { email } });
      if (!user) {
         return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
      }

      // Compara a senha digitada com o hash salvo (bcrypt cuida disso)
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
         return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
      }

      // Conta desativada não pode logar
      if (!user.isActive) {
         return res.status(403).json({ error: 'Conta desativada. Contate um administrador.' });
      }

      // Access token: curto e com dados úteis embutidos (id, email, role)
      const accessToken = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

      // Refresh token: longo, só com o id; também salvo no banco p/ poder revogar
      const refreshToken = jwt.sign({ userId: user.id }, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
      await user.update({ refreshToken });

      // Nunca devolver senha nem o refresh token no corpo da resposta
      const userResponse = user.toJSON();
      delete userResponse.password;
      delete userResponse.refreshToken;

      // Envia o refresh token no cookie httpOnly (o navegador o guarda sozinho)
      res.cookie('refreshToken', refreshToken, {
         ...refreshCookieOptions(),
         maxAge: 7 * 24 * 60 * 60 * 1000, // tempo de vida do cookie: 7 dias em ms
      });

      return res.status(200).json({
         message: 'Login realizado com sucesso.',
         data: {
            user: userResponse,
            accessToken,
         },
      });
   }),

   /**
    * POST /auth/refresh — renova o access token usando o refresh token.
    *
    * É chamada quando o access token (curto) expira, para o usuário continuar
    * logado sem digitar a senha de novo. NÃO exige `authMiddleware`: a "prova"
    * de identidade aqui é o próprio refresh token, que chega pelo cookie.
    *
    * POR QUE VERIFICAR DUAS VEZES (assinatura E banco):
    * - `jwt.verify` garante que o token é legítimo e não expirou (verificação
    *   matemática, sem tocar no banco).
    * - Mas um token pode ser legítimo e mesmo assim ter sido REVOGADO (logout,
    *   troca de senha). Por isso comparamos também com o valor salvo em
    *   `user.refreshToken`: se não bater, a sessão foi invalidada → 401.
    *
    * ROTAÇÃO DO REFRESH TOKEN (boa prática de segurança):
    * A cada refresh emitimos um NOVO refresh token e sobrescrevemos o antigo no
    * banco. Assim, se um refresh token vazar, ele só serve até o próximo uso
    * legítimo (que o invalida). Por isso, no fim, atualizamos o cookie também.
    *
    * SOBRE O try/catch AQUI: a convenção do projeto é NÃO usar try/catch só para
    * devolver 500 genérico (isso fica a cargo do asyncHandler + errorHandler).
    * A exceção é o `jwt.verify`: um token inválido/expirado é um erro ESPERADO do
    * cliente, que deve virar 401 (não 500). Por isso envolvemos apenas essa linha
    * num try/catch estreito; o resto do método deixa erros inesperados subirem.
    *
    * @param {import('express').Request} req - lê o cookie `req.cookies.refreshToken`.
    * @param {import('express').Response} res - novo access token (JSON) + cookie.
    */
   refresh: asyncHandler(async (req, res) => {
      const refreshToken = req.cookies.refreshToken;

      if (!refreshToken) {
         return res.status(401).json({ error: 'Refresh token não encontrado.' });
      }

      // 1ª checagem: a assinatura é válida e o token não expirou? Token inválido
      // é erro esperado → 401 (não deixamos virar 500 no errorHandler).
      let decoded;
      try {
         decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
      } catch {
         return res.status(401).json({ error: 'Refresh token inválido ou expirado.' });
      }

      // Busca o usuário dono do token
      const user = await User.findByPk(decoded.userId);
      if (!user || !user.refreshToken) {
         return res.status(401).json({ error: 'Refresh token inválido.' });
      }

      // Conta desativada não pode renovar o acesso
      if (!user.isActive) {
         return res.status(403).json({ error: 'Conta desativada. Contate um administrador.' });
      }

      // 2ª checagem: o token do cookie é exatamente o que está salvo no banco?
      // (se não for, foi revogado ou substituído por uma rotação anterior)
      if (user.refreshToken !== refreshToken) {
         return res.status(401).json({ error: 'Refresh token expirado ou revogado.' });
      }

      // Emite um novo access token (de novo com id, email e role)
      const newAccessToken = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

      // Rotação do refresh token: emite um novo a cada renovação e invalida o
      // anterior no banco, reduzindo a janela de uso de um token roubado.
      const newRefreshToken = jwt.sign({ userId: user.id }, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
      await user.update({ refreshToken: newRefreshToken });

      res.cookie('refreshToken', newRefreshToken, {
         ...refreshCookieOptions(),
         maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias em ms
      });

      const userResponse = user.toJSON();
      delete userResponse.password;
      delete userResponse.refreshToken;

      return res.status(200).json({
         message: 'Token atualizado com sucesso.',
         data: { accessToken: newAccessToken, user: userResponse },
      });
   }),

   /**
    * POST /auth/logout — encerra a sessão.
    *
    * Roda DEPOIS do `authMiddleware` (precisa de `req.userId`). Encerrar a
    * sessão de verdade tem duas partes:
    * 1. Apagar o refresh token no banco (`refreshToken: null`) — assim, mesmo
    *    que alguém ainda tenha o cookie antigo, ele falhará na checagem do
    *    /auth/refresh (token não bate com o banco).
    * 2. Limpar o cookie no navegador (`clearCookie` com as MESMAS opções usadas
    *    para criá-lo).
    * O access token em si não é apagável (é stateless), mas como expira em
    * poucos minutos e o refresh foi revogado, a sessão fica encerrada na prática.
    *
    * @param {import('express').Request} req - usa `req.userId` (do authMiddleware).
    * @param {import('express').Response} res - limpa o cookie e confirma o logout.
    */
   logout: asyncHandler(async (req, res) => {
      // O ID do usuário vem do middleware de autenticação (req.userId)
      const userId = req.userId;

      const user = await User.findByPk(userId);
      if (!user) {
         return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      // Revoga a sessão no servidor e remove o cookie do navegador
      await user.update({ refreshToken: null });

      res.clearCookie('refreshToken', refreshCookieOptions());

      return res.status(200).json({ message: 'Logout realizado com sucesso.' });
   }),
};
