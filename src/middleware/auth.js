const jwt = require('jsonwebtoken');

/**
 * authMiddleware — porteiro das rotas protegidas (verifica o token JWT).
 *
 * COMO O TOKEN CHEGA AQUI:
 * O frontend envia o access token no cabeçalho HTTP `Authorization`, no formato
 * "Bearer <token>". Aqui separamos a palavra "Bearer" do token em si com
 * `split(' ')[1]` (pega o segundo pedaço, o token).
 *
 * O QUE ELE FAZ, PASSO A PASSO:
 * 1. Se não veio token, responde 401 (não autenticado) e para a requisição.
 * 2. `jwt.verify` confere a ASSINATURA do token usando a chave secreta. Isso
 *    garante que o token foi gerado pelo nosso servidor e não foi adulterado.
 *    Se o token for inválido ou estiver expirado, ele lança erro → 401.
 * 3. Se for válido, lemos os dados embutidos no token (o "payload") e os
 *    deixamos disponíveis em `req` para os próximos middlewares/controllers:
 *    - `req.userId`: id do usuário logado;
 *    - `req.userRole`: papel/role gravado no token.
 * 4. `next()` libera a requisição para seguir adiante.
 *
 * ATENÇÃO: `req.userRole` vem do TOKEN (foto do momento do login). Para decidir
 * permissões sensíveis, prefira reler o usuário do banco — ver
 * `requirePermission.js` e o serviço `canManageTournament`.
 *
 * @param {import('express').Request} req - precisa do header `Authorization`.
 * @param {import('express').Response} res - usada para responder 401 se falhar.
 * @param {import('express').NextFunction} next - libera para o próximo passo.
 */
function authMiddleware(req, res, next) {
   const token = req.headers.authorization?.split(' ')[1]; // formato: "Bearer <token>"

   if (!token) {
      return res.status(401).json({ error: 'Token não fornecido.' });
   }

   try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.userId;
      req.userRole = decoded.role; // role gravado no token no momento do login
      next();
   } catch (error) {
      console.log(error);

      return res.status(401).json({ error: 'Token inválido ou expirado.' });
   }
}

module.exports = authMiddleware;
