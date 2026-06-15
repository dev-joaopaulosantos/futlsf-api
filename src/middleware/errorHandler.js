/**
 * errorHandler — middleware de ERRO central do Express.
 *
 * O QUE É UM MIDDLEWARE DE ERRO:
 * O Express reconhece um middleware como "de erro" quando ele tem EXATAMENTE 4
 * parâmetros: (err, req, res, next). Essa assinatura de 4 argumentos é o que
 * diferencia este middleware dos comuns (que têm 3: req, res, next). Quando
 * qualquer rota chama `next(erro)` (é o que o `asyncHandler` faz por baixo dos
 * panos), o Express "pula" todos os middlewares normais e cai aqui.
 *
 * O QUE ELE FAZ:
 * 1. Registra o erro no console com o método HTTP e a URL (ajuda a depurar:
 *    você vê QUAL rota falhou).
 * 2. Responde com status 500 (erro interno) e uma mensagem genérica — de
 *    propósito, para não vazar detalhes internos/stack trace para o cliente.
 *
 * IMPORTANTE — ORDEM DE REGISTRO:
 * Ele precisa ser registrado por ÚLTIMO em server.js, DEPOIS de todas as rotas
 * (`app.use(errorHandler)` no final). O Express percorre os middlewares na
 * ordem em que foram registrados; se este viesse antes das rotas, ele nunca
 * receberia os erros delas.
 *
 * @param {Error} err - o erro capturado e repassado via `next(err)`.
 * @param {import('express').Request} req - a requisição (usada só para log).
 * @param {import('express').Response} res - a resposta enviada ao cliente.
 * @param {import('express').NextFunction} _next - exigido pela assinatura de 4
 *   args (por isso o `_` indicando que não é usado aqui).
 */
function errorHandler(err, req, res, _next) {
   console.error(`[${req.method} ${req.originalUrl}]`, err);
   res.status(500).json({ error: 'Erro interno do servidor.' });
}

module.exports = errorHandler;
