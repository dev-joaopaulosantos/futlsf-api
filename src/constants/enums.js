/*
 * enums.js — "enums" de domínio (listas fixas de valores permitidos).
 *
 * POR QUE EXISTE: vários controllers precisam validar campos que só aceitam um
 * conjunto fechado de valores (ex.: o tipo de uma fase só pode ser 'LEAGUE' ou
 * 'KNOCKOUT'). Em vez de repetir essas listas espalhadas pelo código (o que
 * causa erros de digitação e inconsistências), centralizamos aqui — uma única
 * "fonte da verdade". Estas listas devem espelhar os ENUM definidos nas
 * migrations/models do banco.
 *
 * Uso típico no controller:
 *   if (!PHASE_TYPES.includes(type)) return res.status(400).json({...});
 */
const PHASE_TYPES = ['LEAGUE', 'KNOCKOUT']; // pontos corridos vs. mata-mata
const MATCH_STATUSES = ['SCHEDULED', 'FINISHED']; // agendada vs. encerrada
const MATCH_LEGS = ['SINGLE', 'FIRST_LEG', 'SECOND_LEG']; // jogo único / ida / volta
const TOURNAMENT_STATUSES = ['NOT_STARTED', 'ONGOING', 'FINISHED', 'CANCELLED'];

module.exports = { PHASE_TYPES, MATCH_STATUSES, MATCH_LEGS, TOURNAMENT_STATUSES };
