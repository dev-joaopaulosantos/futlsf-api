# 🔐 Autenticação: Access Token & Refresh Token (Silent Refresh)

> 📘 **Para quem é:** quem quer entender como funciona o login do sistema.
> **Em 1 minuto:** quando você faz login, o servidor te dá um **token** — pense num **crachá digital** que prova quem você é. Você mostra esse crachá em cada pedido. Como ele expira rápido (por segurança), existe um segundo crachá (o *refresh*) que renova o primeiro sem você precisar logar de novo. Esse "renovar sozinho" é o **Silent Refresh**.
> **Termos:** [GLOSSARIO.md](./docs/GLOSSARIO.md).

Este documento explica a estratégia de autenticação da API (**JWT** com "Silent Refresh") e descreve a **implementação real** do Fut Lagoense. Para o ciclo de requisição e autorização, ver [`docs/ARQUITETURA.md`](./docs/ARQUITETURA.md); para o lado cliente, ver `frontend/docs/ARQUITETURA.md`.

---

## 🧠 1. O conceito: a dupla de tokens

Em vez de um único token de vida longa (perigoso se vazar), a responsabilidade é dividida em dois:

1. **Access Token (o "crachá de visitante"):**
   - **Duração:** curta — **5h** (`JWT_EXPIRES_IN`).
   - **Uso:** enviado em `Authorization: Bearer <token>` em **todas** as requisições privadas.
   - **Conteúdo (payload):** `{ userId, email, role }`, assinado com `JWT_SECRET`.
   - **Armazenamento no front:** **em memória** (store Zustand) — não vai para localStorage.

2. **Refresh Token (o "cartão de sócio"):**
   - **Duração:** longa — **7 dias** (`REFRESH_TOKEN_EXPIRES_IN`).
   - **Uso:** serve **exclusivamente** para obter um novo Access Token.
   - **Assinatura:** `REFRESH_TOKEN_SECRET` (payload `{ userId }`).
   - **Armazenamento no front:** **cookie httpOnly** (inacessível a JavaScript → protege contra XSS). Em produção: `secure` + `sameSite=strict`.
   - **Armazenamento no back:** salvo na coluna `refresh_token` do usuário (permite revogação imediata).

---

## ⚙️ 2. No backend (Express + Sequelize)

Rotas: `POST /auth/login`, `POST /auth/google`, `POST /auth/refresh`, `POST /auth/logout` (ver `src/controllers/AuthController.js`).

> A emissão dos tokens é centralizada no helper `issueSession(user, res)`: gera o
> par de tokens, salva o refresh no banco, seta o cookie httpOnly e devolve
> `{ user, accessToken }`. `login`, `googleLogin` e `refresh` usam esse helper.

### A. Login (`POST /auth/login`)
Com e-mail e senha válidos (e conta ativa):
1. Gera o **Access Token** (`JWT_SECRET`, 5h).
2. Gera o **Refresh Token** (`REFRESH_TOKEN_SECRET`, 7d) e **salva no banco** (`user.refreshToken`).
3. Envia o **Refresh Token num cookie httpOnly** (`Set-Cookie`).
4. Retorna no corpo: `{ data: { user, accessToken } }` (sem `password`/`refreshToken`).

> Contas que entram só pelo Google têm `password` nulo: o login por senha as
> rejeita com `401` (mensagem genérica), sem chegar ao `bcrypt.compare`.

### A.2. Login com Google (`POST /auth/google`)
O frontend usa o botão do Google (`@react-oauth/google`) para obter um **ID token**
e o envia no corpo como `{ credential }`. O backend então:
1. **Valida** o ID token com a `google-auth-library` (assinatura do Google +
   `audience` = nosso `GOOGLE_CLIENT_ID`). Token inválido → `401`.
2. Exige `email_verified` do Google (senão `401`).
3. **Encontra ou cria** o usuário: por `googleId`; ou, se já existe conta com o
   mesmo e-mail, **vincula** o `googleId` a ela; ou cria um organizador novo
   (`role: 'user'`, sem senha).
4. Emite a sessão via `issueSession` — resposta igual à do login normal.

Estratégia escolhida: **ID token** (stateless), não o fluxo de redirecionamento do
passport — encaixa no modelo de access token em memória + refresh em cookie. Só
precisa do `GOOGLE_CLIENT_ID` (público), sem Client Secret.

### B. Atualização silenciosa (`POST /auth/refresh`)
O cliente chama **sem corpo** — o refresh token vai automaticamente no cookie:
1. Valida a assinatura/expiração do refresh token do cookie.
2. Busca o usuário e **compara** se o token recebido é igual ao salvo no banco (anti-reuso); rejeita se diferente, `null` ou conta desativada (`401`/`403`).
3. Gera um **novo Access Token** e, por segurança, **rotaciona o Refresh Token**: emite um novo, salva no banco (invalidando o anterior) e reescreve o cookie.
4. Retorna `{ data: { accessToken, user } }`.

### C. Logout (`POST /auth/logout`)
1. Requer Access Token válido.
2. Zera `refreshToken` no banco e limpa o cookie → **revoga a sessão imediatamente**.

> Desativar uma conta (`isActive = false`) também zera o `refreshToken`, derrubando a sessão.

---

## 💻 3. No frontend (Next.js + Axios)

O usuário não percebe a expiração do token graças aos **interceptors do Axios** (`frontend/src/lib/api.js`). A implementação real:

1. O **request interceptor** injeta `Authorization: Bearer <accessToken>` (lido do store Zustand) em cada chamada.
2. Quando o Access Token expira, a API responde **401**.
3. O **response interceptor** segura o 401, chama `POST /auth/refresh` (com `withCredentials: true`, enviando o cookie) e obtém um novo Access Token.
4. Atualiza o token no store e **refaz a requisição original**.
5. Se o refresh falhar (expirou os 7 dias ou foi revogado), faz `clearAuth()` e redireciona para `/login`.
6. No boot do app, `AuthProvider`/`useAuthInit` tenta um `/auth/refresh` para restaurar a sessão (o access token vive só em memória e se perde no refresh da página).

### Esqueleto do interceptor (real)
```javascript
// frontend/src/lib/api.js (resumo)
import axios from 'axios';
import useAuthStore from '@/store/authStore';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // envia o cookie httpOnly do refresh token
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isRefresh = original.url?.includes('/auth/refresh');
    if (error.response?.status === 401 && !original._retry && !isRefresh) {
      original._retry = true;
      try {
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
          null,
          { withCredentials: true },
        );
        const { setAuth, user } = useAuthStore.getState();
        setAuth(user, data.data.accessToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch {
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
```

---

## 📱 4. Observação para clientes mobile (Flutter)
O refresh depende de um **cookie httpOnly**, então no mobile use um cookie jar (ex.: `dio` + `cookie_jar`) para que o cookie do `/auth/login` seja reenviado no `/auth/refresh`. Alternativa: persistir o Access Token em armazenamento seguro e re-logar quando expirar. Os endpoints **públicos de leitura** não precisam de token — ver [`docs/API.md`](./docs/API.md).
