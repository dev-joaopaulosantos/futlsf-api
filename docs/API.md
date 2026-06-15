# Referência da API — Fut Lagoense

> 📘 **Para quem é:** quem vai consumir a API (ex.: o site, ou um app mobile em Flutter).
> **O que você encontra aqui:** a lista de "endereços" (endpoints) da API, o que cada um faz, o que mandar e o que recebe de volta.
> **Termos técnicos:** veja o [GLOSSARIO.md](./GLOSSARIO.md) (API, endpoint, token, status HTTP, etc.).

Base URL (desenvolvimento): `http://localhost:3001` — é o começo de todo endereço. Ex.: o endpoint `/tournaments` fica em `http://localhost:3001/tournaments`.

### Como ler esta página
Cada endpoint tem:
- **Método** = o verbo do pedido: `GET` (ler), `POST` (criar), `PUT` (atualizar), `DELETE` (apagar).
- **Caminho** = o endereço, ex.: `/tournaments/:id` (o `:id` você troca por um número, ex.: `/tournaments/5`).
- **Corpo (body)** = os dados que você envia (em `POST`/`PUT`), no formato **JSON**.
- **Resposta** = o que volta. Sucesso vem como `{ "data": ... }` (às vezes com `"message"`); erro vem como `{ "error": "..." }`.

**Quem pode acessar** (legenda usada nas tabelas):
- 🔓 **público** — qualquer um, sem login.
- 🔒 **logado** — precisa enviar o token no cabeçalho `Authorization: Bearer <token>`.
- 🛡️ **permissão** — além de logado, precisa de uma permissão específica de admin.

## Autenticação
- Faça `POST /auth/login` e use o `accessToken` retornado no header `Authorization: Bearer <accessToken>` nas rotas 🔒/🛡️.
- O **refresh token** vai num **cookie httpOnly** (`credentials: 'include'`/`withCredentials`). Quando o access token expira (5h), chame `POST /auth/refresh` para obter um novo (há rotação do refresh).
- Erros de auth: `401` (token ausente/inválido/expirado), `403` (sem permissão ou conta desativada).

### 📱 Nota para o app mobile (Flutter)
- Todos os **endpoints de leitura abaixo marcados 🔓 não exigem token** — ideais para o app público.
- Apps mobile geralmente **não enviam header `Origin`**; o CORS da API aceita requisições sem `Origin`, então o consumo direto funciona.
- Para áreas autenticadas no futuro: o refresh via cookie httpOnly depende de um cookie jar (ex.: `dio` + `cookie_jar`). Alternativa: persistir o access token e re-logar quando expirar.
- O access token dura **5h**; trate `401` re-tentando após `POST /auth/refresh` (ou re-login).

### Rate limits
| Rota | Limite |
|---|---|
| `POST /auth/login` | 10 falhas / 15 min por IP |
| `POST /auth/refresh` | 60 / 15 min por IP |
| `POST /users/register` | 20 / 1 h por IP |

Excedido → `429 { "error": "..." }`.

---

## ⭐ Endpoints públicos de leitura (para o app mobile)
Sem autenticação:

| Método | Caminho | Descrição |
|---|---|---|
| GET | `/tournaments` | Lista campeonatos |
| GET | `/tournaments/:id` | Detalhe de um campeonato (com times, organizador, pódio, premiação) |
| GET | `/tournaments/:id/teams` | Times do campeonato (com `groupId` de cada um) |
| GET | `/phases?tournamentId=:id` | Fases (filtra por campeonato) |
| GET | `/phases/:id` | Fase com grupos e partidas |
| GET | `/groups?phaseId=:id` | Grupos (filtra por fase) |
| GET | `/groups/:id` | Grupo com seus times (members) |
| GET | `/groups/:id/standings` | **Classificação** calculada do grupo |
| GET | `/matches?phaseId=:id&groupId=:id` | Partidas (filtros opcionais) |
| GET | `/matches/:id` | Detalhe de uma partida |

Fluxo típico no app: `GET /tournaments` → `GET /tournaments/:id` → `GET /phases?tournamentId=` → por fase, `GET /groups?phaseId=` + `GET /groups/:id/standings` (pontos corridos) ou `GET /matches?phaseId=` (mata-mata).

---

## Auth

### POST /auth/login 🔓
Body: `{ "email": "a@b.com", "password": "secret" }`
Resposta `200`:
```json
{ "message": "Login realizado com sucesso.",
  "data": { "user": { "id": 1, "name": "...", "email": "...", "role": "admin", "permissions": [], "isActive": true, "isSuperAdmin": true }, "accessToken": "eyJ..." } }
```
Erros: `400` campos faltando · `401` credenciais inválidas · `403` conta desativada.

### POST /auth/refresh 🔓 (usa cookie)
Sem body; envia o cookie `refreshToken`. Resposta `200`: `{ "message": "...", "data": { "accessToken": "eyJ...", "user": {...} } }`. Erros: `401` ausente/inválido/revogado · `403` desativada.

### POST /auth/logout 🔒
Revoga o refresh token (zera no banco + limpa cookie). Resposta `200`: `{ "message": "Logout realizado com sucesso." }`.

---

## Tournaments

| Método | Caminho | Acesso |
|---|---|---|
| POST | `/tournaments` | 🔒 |
| GET | `/tournaments` | 🔓 |
| GET | `/tournaments/:id` | 🔓 |
| PUT | `/tournaments/:id` | 🔒 dono ou 🛡️ `manage_tournaments` |
| DELETE | `/tournaments/:id` | 🔒 dono ou 🛡️ `manage_tournaments` |
| POST | `/tournaments/:tournamentId/teams` | 🔒 dono/`manage_tournaments` |
| DELETE | `/tournaments/:tournamentId/teams/:teamId` | 🔒 dono/`manage_tournaments` |
| GET | `/tournaments/:tournamentId/teams` | 🔓 |
| PUT | `/tournaments/:tournamentId/teams/:teamId/group` | 🔒 dono/`manage_tournaments` |

**POST /tournaments** — Body: `{ "name": "Copa X", "description?": "...", "logoUrl?": "...", "organizerName?": "..." }` (o `userId` vem do token). `201 { data: tournament }`.

**GET /tournaments** — `200 { data: [ { id, name, description, logoUrl, status, organizerName, organizer: { id, name }, teams: [...], champion, runnerUp, thirdPlace, topScorerTeam, bestPlayerTeam, bestGoalkeeperTeam, createdAt, updatedAt } ] }`.

**GET /tournaments/:id** — mesmo shape do item acima. `404` se não existe.

**PUT /tournaments/:id** — Body parcial: `name, description, logoUrl, organizerName, status` (∈ `NOT_STARTED|ONGOING|FINISHED|CANCELLED`), `championId, runnerUpId, thirdPlaceId, topScorerName, topScorerTeamId, bestPlayerName, bestPlayerTeamId, bestGoalkeeperName, bestGoalkeeperTeamId, awards` (array `[{title, prize}]`). `200 { data }`. `403` sem permissão.

**DELETE /tournaments/:id** — apaga em cascata (fases/grupos/partidas/vínculos). `200 { message }`.

**POST /:tournamentId/teams** — Body: `{ "teamId": 5, "groupId?": 3 }`. Valida que o time pertence ao mesmo organizador (salvo `manage_tournaments`). `201` · `409` já associado.

**GET /:tournamentId/teams** 🔓 — `200 { data: [ { id, name, logoUrl, groupId } ] }`.

**PUT /:tournamentId/teams/:teamId/group** — Body: `{ "groupId": 3 | null }`. Move o time de grupo. `400` se o grupo não pertence ao campeonato.

---

## Teams
Todas 🔒. O organizador vê/gere os próprios times; admins com `view_all`/`manage_tournaments` veem de outros.

| Método | Caminho | Observações |
|---|---|---|
| POST | `/teams` | Body `{ name, logoUrl? }`; `userId` do token. `201` |
| GET | `/teams` | Lista os times do usuário. `?ownerId=X` (admin com `view_all`/`manage_tournaments`) lista de outro |
| GET | `/teams/:id` | Dono ou admin autorizado |
| PUT | `/teams/:id` | Body `{ name?, logoUrl? }`. Dono ou `manage_tournaments` |
| DELETE | `/teams/:id` | Dono ou `manage_tournaments` |
| POST | `/teams/:teamId/tournaments` | Body `{ tournamentId, groupId? }`. Associa a um campeonato |
| DELETE | `/teams/:teamId/tournaments/:tournamentId` | Desassocia |
| GET | `/teams/:teamId/tournaments` | Campeonatos do time |

---

## Phases

| Método | Caminho | Acesso |
|---|---|---|
| POST | `/phases` | 🔒 dono/`manage_tournaments` |
| GET | `/phases` | 🔓 (use `?tournamentId=`) |
| GET | `/phases/:id` | 🔓 |
| PUT | `/phases/:id` | 🔒 dono/`manage_tournaments` |
| DELETE | `/phases/:id` | 🔒 dono/`manage_tournaments` |

**POST /phases** — Body: `{ "tournamentId": 1, "name": "Fase de grupos", "type": "LEAGUE", "order?": 1 }`. `type` ∈ `LEAGUE|KNOCKOUT`. `201 { data: phase }`.

**GET /phases?tournamentId=1** — `200 { data: [ { id, name, type, order, tournamentId, groups: [...] } ] }` (ordenado por `order`).

**GET /phases/:id** — inclui `groups` e `matches`.

---

## Groups

| Método | Caminho | Acesso |
|---|---|---|
| POST | `/groups` | 🔒 dono/`manage_tournaments` |
| GET | `/groups` | 🔓 (use `?phaseId=`) |
| GET | `/groups/:id` | 🔓 |
| PUT | `/groups/:id` | 🔒 dono/`manage_tournaments` |
| DELETE | `/groups/:id` | 🔒 dono/`manage_tournaments` |
| GET | `/groups/:id/standings` | 🔓 |

**POST /groups** — Body: `{ "phaseId": 2, "name": "Grupo A" }`. A fase precisa ser `LEAGUE` (`422` caso contrário). `201`.

**GET /groups/:id/standings** 🔓 — classificação calculada a partir das partidas `FINISHED`:
```json
{ "data": [ { "team": { "id": 5, "name": "...", "logoUrl": "..." },
             "P": 9, "J": 3, "V": 3, "E": 0, "D": 0, "GP": 7, "GC": 2, "SG": 5 } ] }
```
Ordenação: pontos (P) → vitórias (V) → saldo (SG) → gols pró (GP) → nome.

---

## Matches

| Método | Caminho | Acesso |
|---|---|---|
| POST | `/matches` | 🔒 dono/`manage_tournaments` |
| GET | `/matches` | 🔓 (`?phaseId=`, `?groupId=`) |
| GET | `/matches/:id` | 🔓 |
| PUT | `/matches/:id` | 🔒 dono/`manage_tournaments` |
| DELETE | `/matches/:id` | 🔒 dono/`manage_tournaments` |

**POST /matches** — Body:
```json
{ "phaseId": 2, "groupId?": 3, "homeTeamId": 5, "awayTeamId": 6,
  "matchDate?": "2026-03-20", "status?": "SCHEDULED", "homeScore?": null, "awayScore?": null, "leg?": "SINGLE" }
```
`status` ∈ `SCHEDULED|FINISHED` · `leg` ∈ `SINGLE|FIRST_LEG|SECOND_LEG` · `homeTeamId ≠ awayTeamId`. `201 { data: match }`.

**GET /matches?groupId=3** — `200 { data: [ { id, homeScore, awayScore, status, leg, matchDate, phaseId, groupId, homeTeamId, awayTeamId, home_team, away_team, phase } ] }` (ordenado por data).

**PUT /matches/:id** — Body parcial: `{ homeScore, awayScore, status, matchDate, groupId, leg }`.

---

## Users

| Método | Caminho | Acesso |
|---|---|---|
| POST | `/users/register` | 🔓 (auto-cadastro; cria sempre `role: user`) |
| POST | `/users` | 🛡️ `manage_admins` (cria user/admin com permissões) |
| GET | `/users` | 🛡️ `view_all` \| `manage_organizers` \| `manage_admins` |
| GET | `/users/permissions` | 🛡️ `manage_admins` (catálogo de permissões) |
| GET | `/users/:id` | 🔒 próprio ou admin autorizado |
| PUT | `/users/:id` | 🔒 próprio (dados básicos) ou admin (role/permissões/ativar) |
| DELETE | `/users/:id` | 🔒 próprio ou 🛡️ `manage_organizers` |

**POST /users/register** 🔓 — Body: `{ "name", "email", "password" }`. `201 { data: user }` (sem `password`). `409` e-mail em uso.

**POST /users** 🛡️ — Body: `{ name, email, password, role?: "admin"|"user", permissions?: ["manage_tournaments", ...] }`. Permissões são filtradas pelo catálogo.

**PUT /users/:id** — Próprio: `{ name?, email?, password? }`. Admin com `manage_admins`: também `role`, `permissions`. Admin com `manage_organizers`: `isActive` (desativar revoga sessão). O super-admin só é editável por ele mesmo.

**GET /users/permissions** → `{ "data": ["manage_organizers", "manage_tournaments", "manage_admins", "view_all"] }`.

---

## Tabela de códigos de status
| Código | Quando |
|---|---|
| 200 / 201 | Sucesso / criado |
| 400 | Validação (campo faltando, enum inválido) |
| 401 | Token ausente/inválido/expirado |
| 403 | Sem permissão / conta desativada / super-admin protegido |
| 404 | Recurso não encontrado |
| 409 | Conflito (e-mail/associação duplicada) |
| 422 | Regra de negócio (ex.: grupo em fase não-LEAGUE) |
| 429 | Rate limit excedido |
| 500 | Erro inesperado |
