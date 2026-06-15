// Catálogo fixo de permissões granulares atribuíveis a admins.
// O super-admin (proprietário do sistema) tem todas implicitamente.
const PERMISSIONS = {
   MANAGE_ORGANIZERS: 'manage_organizers', // editar/desativar/excluir organizadores
   MANAGE_TOURNAMENTS: 'manage_tournaments', // editar/excluir campeonatos de terceiros
   MANAGE_ADMINS: 'manage_admins', // criar admins e definir permissões
   VIEW_ALL: 'view_all', // leitura de todas as contas/campeonatos
};

// Array com TODOS os valores de permissão (ex.: usado para validar entradas e
// montar a tela de gestão de admins). `Object.values` extrai só os valores.
const ALL_PERMISSIONS = Object.values(PERMISSIONS);

/**
 * userCan — coração da autorização granular: o usuário tem ESTA permissão?
 *
 * Regras, na ordem:
 * 1. Só admins ATIVOS podem ter permissões. Qualquer outra coisa → false.
 * 2. O super-admin tem todas as permissões implicitamente → true.
 * 3. Caso contrário, verifica se a permissão está na lista `user.permissions`
 *    (o `?? []` evita erro se o campo estiver nulo).
 *
 * Importante: recebe o usuário JÁ CARREGADO do banco (não o token), garantindo
 * que role/isActive/permissions estejam atualizados.
 *
 * @param {object} user - usuário do banco (com role, isActive, isSuperAdmin, permissions).
 * @param {string} permission - chave de permissão (ex.: PERMISSIONS.MANAGE_TOURNAMENTS).
 * @returns {boolean} true se o usuário pode realizar a ação.
 */
function userCan(user, permission) {
   if (!user || user.role !== 'admin' || user.isActive === false) return false;
   if (user.isSuperAdmin) return true;
   return (user.permissions ?? []).includes(permission);
}

module.exports = { PERMISSIONS, ALL_PERMISSIONS, userCan };
