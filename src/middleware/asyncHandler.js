/**
 * asyncHandler — "embrulho" para funções de rota assíncronas (async/await).
 *
 * PROBLEMA QUE RESOLVE:
 * No Express, quando uma função `async` lança um erro (ou uma Promise é
 * rejeitada), o Express NÃO percebe sozinho. Sem tratamento, a requisição fica
 * "pendurada" e o cliente nunca recebe resposta. A solução tradicional é
 * colocar um `try/catch` em TODA função de controller — o que é repetitivo.
 *
 * COMO FUNCIONA:
 * Esta função recebe o seu handler (`fn`) e devolve um NOVO handler. Esse novo
 * handler executa o seu `fn` e, se ele falhar, captura o erro com `.catch(next)`.
 * Chamar `next(erro)` é a forma do Express de dizer "deu erro aqui" — e o
 * Express então pula direto para o middleware de erro central (ver
 * `errorHandler.js`). Assim você escreve os controllers sem try/catch e todos
 * os erros inesperados caem em um único lugar.
 *
 * USO:
 *   router.get('/', asyncHandler(async (req, res) => { ... }))
 *
 * @param {(req, res, next) => Promise<any>} fn - o handler assíncrono da rota.
 * @returns {(req, res, next) => void} um handler que repassa erros ao `next`.
 */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
