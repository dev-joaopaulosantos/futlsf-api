const { User } = require('../database/models');
const { userCan } = require('../constants/permissions');

/**
 * requirePermission — autorização por PERMISSÃO GRANULAR.
 *
 * DIFERENÇA PARA O `authorize`:
 * `authorize` olha só o papel (admin/usuário). Aqui vamos mais fino: além de
 * ser admin ativo, o usuário precisa ter PERMISSÕES específicas (ex.:
 * "MANAGE_TOURNAMENTS"). As permissões ficam catalogadas em
 * `constants/permissions.js`, e `userCan(user, perm)` responde se o usuário tem
 * aquela permissão.
 *
 * Esta versão exige TODAS as permissões passadas (regra "E"/AND).
 *
 * PADRÃO "FÁBRICA DE MIDDLEWARE": recebe as permissões (via `...perms`, que
 * agrupa os argumentos num array) e devolve o middleware pronto. Uso:
 *   router.post('/', authMiddleware, requirePermission('MANAGE_TOURNAMENTS'), ...)
 *
 * PASSO A PASSO:
 * 1. Reaproveita `req.user` se um middleware anterior já o carregou; senão,
 *    busca no banco. (Importante: confiamos no banco, não no role do token.)
 * 2. Barra quem não for admin ativo → 403.
 * 3. Libera se for super-admin (tem tudo) OU se passar em TODAS as permissões.
 *
 * @param {...string} perms - chaves de permissão exigidas (todas necessárias).
 * @returns {(req, res, next) => Promise<void>} o middleware configurado.
 */
function requirePermission(...perms) {
   return async (req, res, next) => {
      try {
         const user = req.user ?? (await User.findByPk(req.userId));

         if (!user || user.role !== 'admin' || !user.isActive) {
            return res.status(403).json({ error: 'Acesso não permitido.' });
         }

         const granted = user.isSuperAdmin || perms.every((p) => userCan(user, p));
         if (!granted) {
            return res.status(403).json({ error: 'Você não tem permissão para esta ação.' });
         }

         req.user = user;
         next();
      } catch (error) {
         console.error('Erro ao verificar permissão:', error);
         return res.status(500).json({ error: 'Erro interno do servidor.' });
      }
   };
}

/**
 * requireAnyPermission — variante do anterior com regra "OU"/OR.
 *
 * Idêntica a `requirePermission`, mas basta o usuário ter PELO MENOS UMA das
 * permissões informadas (usa `perms.some(...)` em vez de `perms.every(...)`).
 * Útil quando uma rota pode ser acessada por perfis com permissões diferentes.
 *
 * @param {...string} perms - chaves de permissão (qualquer uma já libera).
 * @returns {(req, res, next) => Promise<void>} o middleware configurado.
 */
function requireAnyPermission(...perms) {
   return async (req, res, next) => {
      try {
         const user = req.user ?? (await User.findByPk(req.userId));

         if (!user || user.role !== 'admin' || !user.isActive) {
            return res.status(403).json({ error: 'Acesso não permitido.' });
         }

         const granted = user.isSuperAdmin || perms.some((p) => userCan(user, p));
         if (!granted) {
            return res.status(403).json({ error: 'Você não tem permissão para esta ação.' });
         }

         req.user = user;
         next();
      } catch (error) {
         console.error('Erro ao verificar permissão:', error);
         return res.status(500).json({ error: 'Erro interno do servidor.' });
      }
   };
}

module.exports = requirePermission;
module.exports.requireAnyPermission = requireAnyPermission;
