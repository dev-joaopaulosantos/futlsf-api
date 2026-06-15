const { User } = require('../database/models');

/**
 * authorize — autorização por PAPEL (role).
 *
 * DIFERENÇA ENTRE AUTENTICAR E AUTORIZAR:
 * - `authMiddleware` (auth.js) AUTENTICA: confirma QUEM é o usuário.
 * - `authorize` AUTORIZA: decide SE aquele usuário PODE acessar a rota.
 * Por isso `authorize` roda depois de `authMiddleware` na cadeia de middlewares
 * (ele depende de `req.userId`, que o auth preencheu).
 *
 * PADRÃO "FÁBRICA DE MIDDLEWARE":
 * Repare que `authorize` não é o middleware em si — ele RECEBE a lista de roles
 * permitidas e DEVOLVE um middleware já configurado. Isso permite reutilizar:
 *   router.post('/', authMiddleware, authorize(['admin']), Controller.create)
 *
 * O QUE FAZ:
 * 1. Busca o usuário no banco pelo id (`req.userId`).
 * 2. Se não existir, ou se o role dele não estiver na lista permitida → 403
 *    (autenticado, mas sem permissão).
 * 3. Caso ok, anexa o usuário completo em `req.user` (para os controllers
 *    reaproveitarem) e segue com `next()`.
 *
 * @param {string[]} roles - papéis que têm acesso (ex.: ['admin']).
 * @returns {(req, res, next) => Promise<void>} o middleware configurado.
 */
function authorize(roles = []) {
   return async (req, res, next) => {
      const user = await User.findByPk(req.userId);

      if (!user || !roles.includes(user.role)) {
         return res.status(403).json({ error: 'Acesso não permitido.' });
      }

      req.user = user; // disponibiliza o usuário completo (com role) p/ frente
      next();
   };
}

module.exports = authorize;
