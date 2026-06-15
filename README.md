# Fut Lagoense — Backend (API)

> 📘 **O que é isto?** É o "cérebro" do sistema Fut Lagoense: um programa que fica ligado guardando os dados (campeonatos, times, partidas...) e respondendo aos pedidos do site e, futuramente, de um app mobile. Esse tipo de programa se chama **API** (ver [glossário](./docs/GLOSSARIO.md)).
>
> Em resumo: **organizadores** criam e gerenciam campeonatos (times, fases, grupos, partidas, placares); o **público** consulta tabelas e resultados sem precisar de login.

Construído com **Express 5** (servidor) + **Sequelize** (acesso ao banco MySQL) + **JWT** (login). Novo no projeto? Comece pela [arquitetura](./docs/ARQUITETURA.md).

## Stack
- **Express 5** — servidor HTTP/rotas
- **Sequelize 6 + mysql2** — ORM e driver MySQL
- **jsonwebtoken** — access token (Bearer) + refresh token (cookie httpOnly)
- **bcrypt** — hash de senhas
- **express-rate-limit** — proteção de brute force no login/refresh/registro
- **cors**, **cookie-parser**, **dotenv**

## Pré-requisitos
- Node.js 18+ (testado em 22)
- MySQL em execução

## Setup
```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
#   edite o .env: dados do MySQL e gere os segredos JWT
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
#   (opcional) GOOGLE_CLIENT_ID para o login com Google — ver seção abaixo

# 3. Criar o banco (se ainda não existir) com o nome de DB_NAME

# 4. Rodar as "migrations" = criar as tabelas no banco
#    (migration é um arquivo que descreve a estrutura do banco; ver glossário)
npx sequelize-cli db:migrate

# 5. Rodar os "seeders" = inserir dados iniciais, como o admin dono do sistema
npx sequelize-cli db:seed:all

# 6. Subir em desenvolvimento (nodemon)
npm run dev
# ou produção:
npm start
```

A API sobe em `http://localhost:<PORT>` (padrão `3001`). Teste: `GET /` → `{ "message": "API em funcionamento" }`.

### Usuário inicial (seed)
O seeder cria o **proprietário do sistema** (super-admin). Credenciais padrão: veja `src/database/seeders/` — troque a senha após o primeiro login.

### Login com Google (opcional)
Para habilitar o botão "Entrar com Google":
1. No [Google Cloud Console](https://console.cloud.google.com/): crie um projeto.
2. **APIs e Serviços → Tela de consentimento OAuth** (tipo "External"); adicione os
   escopos **não confidenciais** `email`, `profile`, `openid`.
3. **APIs e Serviços → Credenciais → Criar credencial → ID do cliente OAuth** →
   tipo **Aplicativo da Web**. Em *Origens JavaScript autorizadas*, adicione
   `http://localhost:3000` (e o domínio de produção).
4. Copie o **Client ID** gerado para:
   - backend: `GOOGLE_CLIENT_ID` no `.env`;
   - frontend: `NEXT_PUBLIC_GOOGLE_CLIENT_ID` no `.env.local` (mesmo valor).

Sem essa variável, o login por e-mail/senha continua funcionando normalmente; só o
botão do Google não aparece. Não é necessário Client Secret nesta abordagem.

## Scripts (`package.json`)
| Script | Ação |
|---|---|
| `npm run dev` | Sobe com nodemon (reload automático) |
| `npm start` | Sobe com node |
| `npm test` | (placeholder — sem testes automatizados ainda) |

Comandos do Sequelize CLI (migrations/seeders): ver [`COMMANDS.md`](./COMMANDS.md).

## Documentação
- 📖 **Glossário (comece por aqui se for iniciante):** [`docs/GLOSSARIO.md`](./docs/GLOSSARIO.md) — termos técnicos em português simples.
- 📐 **Arquitetura interna:** [`docs/ARQUITETURA.md`](./docs/ARQUITETURA.md) — estrutura, ciclo de requisição, modelo de dados, autorização, convenções, como adicionar endpoints.
- 🌐 **Referência da API (pública):** [`docs/API.md`](./docs/API.md) — todos os endpoints, com exemplos. Para o app mobile, ver a seção de endpoints públicos de leitura.
- 🤖 **OpenAPI:** [`docs/openapi.yaml`](./docs/openapi.yaml) — spec para gerar cliente (Flutter/Dart), importar no Postman/Insomnia ou servir no Swagger UI.
- 📮 **Coleção Postman:** [`docs/fut-lagoense.postman_collection.json`](./docs/fut-lagoense.postman_collection.json).
- 🔐 **Autenticação (JWT + silent refresh):** [`AUTH_DOCS.md`](./AUTH_DOCS.md) — fluxo real de login/refresh/logout no backend e no frontend.

> **Manutenção:** ao alterar rotas, contratos ou arquitetura, atualize a documentação correspondente. Ver [`AGENTS.md`](./AGENTS.md).
