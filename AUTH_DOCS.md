# 🔐 Autenticação: Access Token & Refresh Token (Silent Refresh)

Esta documentação detalha o fluxo de autenticação da nossa API utilizando **JSON Web Tokens (JWT)**. A estratégia adotada é a do "Silent Refresh", garantindo alta segurança sem prejudicar a experiência do usuário (UX).

---

## 🧠 1. O Conceito Base: A Dupla de Tokens

Em vez de usar apenas um token que dura para sempre (o que é perigoso em caso de roubo), dividimos a responsabilidade em dois:

1. **Access Token (O Crachá de Visitante):**
   - **Duração:** Curta (ex: 15 minutos).
   - **Uso:** Enviado no cabeçalho (`Authorization: Bearer <token>`) de **todas** as requisições privadas (ex: listar campeonatos, criar times).
   - **Armazenamento (Front):** Memória da aplicação.

2. **Refresh Token (O Cartão de Sócio):**
   - **Duração:** Longa (ex: 7 dias).
   - **Uso:** Serve **exclusivamente** para pedir um novo Access Token quando o atual expirar.
   - **Armazenamento (Front):** LocalStorage (ReactJS) ou AsyncStorage/SecureStore (React Native).
   - **Armazenamento (Back):** Salvo no banco de dados, na coluna `refresh_token` da tabela do usuário.

---

## ⚙️ 2. Como funciona no Backend (Node.js + Sequelize)

O fluxo no servidor é dividido em três rotas principais: `/login`, `/refresh` e `/logout`.

### A. Login (`POST /auth/login`)

Quando o usuário envia e-mail e senha válidos:

1. O servidor gera o **Access Token** usando a `JWT_SECRET`.
2. O servidor gera o **Refresh Token** usando a `REFRESH_TOKEN_SECRET`.
3. O Refresh Token é **salvo no banco de dados** na linha daquele usuário (`user.refreshToken = refreshToken`).
4. Ambos os tokens são devolvidos no JSON de resposta.

### B. Atualização Silenciosa (`POST /auth/refresh`)

Quando o Access Token expira, o frontend bate nesta rota enviando o Refresh Token.

1. O servidor verifica se o Refresh Token é matematicamente válido (não expirou e a assinatura está correta).
2. O servidor busca o usuário no banco e **compara** se o token recebido é igual ao token salvo no banco.
3. Se tudo bater, o servidor gera um **novo Access Token** (mais 15 min) e devolve para o frontend.
   - _Segurança:_ Se o token no banco for diferente (ou `null`), o acesso é negado (401), forçando o usuário a deslogar.

### C. Logout (`POST /auth/logout`)

1. Requer autenticação prévia (precisa enviar o Access Token atual).
2. O servidor identifica o usuário e atualiza a coluna `refreshToken` para `null` no banco de dados.
3. Isso **revoga instantaneamente** qualquer possibilidade de gerar novos tokens.

---

## 💻 3. Como funciona no Frontend (ReactJS / Axios)

A mágica da UX acontece no frontend. O usuário nunca deve perceber que o token expirou. Para isso, utilizamos os **Interceptors do Axios** (uma espécie de "pedágio" que analisa as respostas da API).

### O Fluxo (Passo a Passo)

1. O React tenta buscar dados protegidos, por exemplo: `api.get('/tournaments')`.
2. O servidor percebe que o Access Token de 15 min venceu e devolve o status HTTP **401 (Unauthorized)**.
3. O interceptor do Axios "segura" esse erro antes de mostrá-lo na tela.
4. O interceptor chama a rota `POST /auth/refresh` enviando o Refresh Token que está no LocalStorage.
5. Recebendo o novo Access Token, o interceptor o salva no LocalStorage e **refaz a requisição original** (`api.get('/tournaments')`) com o novo token.

### Exemplo de Implementação (Axios Interceptor)

```javascript
import axios from 'axios';

const api = axios.create({
   baseURL: 'http://localhost:3000',
});

// Pedágio de Resposta
api.interceptors.response.use(
   (response) => {
      // Se a requisição deu certo, apenas repassa os dados
      return response;
   },
   async (error) => {
      const originalRequest = error.config;

      // Se o erro for 401 (Token Expirado) e não for uma tentativa de refresh anterior
      if (error.response?.status === 401 && !originalRequest._retry) {
         originalRequest._retry = true; // Marca para não entrar em loop infinito

         try {
            const refreshToken = localStorage.getItem('@App:refreshToken');

            // Pede um novo token para a API
            const { data } = await axios.post('http://localhost:3000/auth/refresh', {
               refreshToken,
            });

            const newAccessToken = data.data.accessToken;

            // Atualiza o token no front
            localStorage.setItem('@App:accessToken', newAccessToken);

            // Atualiza o cabeçalho da requisição que havia falhado
            originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

            // Refaz a requisição original
            return api(originalRequest);
         } catch (refreshError) {
            // Se o refresh falhar (ex: expirou os 7 dias ou foi revogado no banco)
            // Desloga o usuário e manda pra tela de Login
            localStorage.clear();
            window.location.href = '/login';
            return Promise.reject(refreshError);
         }
      }

      return Promise.reject(error);
   },
);

export default api;
```
