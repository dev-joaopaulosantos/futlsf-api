# Guia para agentes — Backend

API Express 5 + Sequelize (MySQL) + JWT. Antes de mexer, leia [`docs/ARQUITETURA.md`](./docs/ARQUITETURA.md).

## Convenções obrigatórias
- **Controllers:** cada método é `nome: asyncHandler(async (req, res) => { ... })`. Sem `try/catch` para erro inesperado (vai ao `errorHandler`); validações de negócio retornam `res.status(4xx).json({ error })`.
- **Enums:** valide com `src/constants/enums.js`. Não duplique arrays de enum.
- **Autorização:** recursos de campeonato (incl. fases/grupos/partidas) usam `services/canManageTournament.js`; nunca confie em `req.userRole`. Gestão de usuários usa `requirePermission`/`requireAnyPermission`.
- **Rotas:** REST por recurso (`POST /`, `GET /`, `GET /:id`, `PUT /:id`, `DELETE /:id`). Exceções: `/auth/*`, `POST /users/register`, `GET /users/permissions`.
- **Segurança:** senhas com `bcrypt`; nunca retornar `password`/`refreshToken`.

## Manutenção de documentação (IMPORTANTE)
Toda alteração deve manter a documentação em dia. Ao alterar:
- **Rotas / contratos de request-response** → atualizar `docs/API.md`, `docs/openapi.yaml` e `docs/fut-lagoense.postman_collection.json`.
- **Arquitetura, convenções, modelo de dados** → atualizar `docs/ARQUITETURA.md` (inclusive os diagramas Mermaid).
- **Variáveis de ambiente** → atualizar `.env.example` e a tabela em `docs/ARQUITETURA.md`.
- **Setup / scripts** → atualizar `README.md`.

Mapa da documentação: `README.md` (setup) · `docs/ARQUITETURA.md` (interna) · `docs/API.md` + `docs/openapi.yaml` + coleção Postman (API pública) · `AUTH_DOCS.md` (conceito de auth) · `COMMANDS.md` (Sequelize CLI).
