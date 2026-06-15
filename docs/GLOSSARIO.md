# Glossário — termos técnicos (backend)

> 📘 **Para que serve:** uma lista de termos que aparecem na documentação, explicados em português simples. Sempre que bater uma dúvida com alguma palavra, volte aqui.

## Conceitos da web / API

**API**
Programa que outros programas usam para pedir e enviar dados. Pense num **garçom**: o cliente (app/site) faz um pedido, o garçom leva até a cozinha (o servidor) e traz a resposta. A API é esse garçom.

**Endpoint / Rota**
Um "endereço" dentro da API que faz uma coisa específica. Ex.: `GET /tournaments` é o endereço que devolve a lista de campeonatos. **Rota** e **endpoint** são quase sinônimos aqui.

**Método HTTP (GET / POST / PUT / DELETE)**
O "verbo" do pedido — diz **o que** você quer fazer no endereço:
- `GET` = **ler** (buscar dados)
- `POST` = **criar** algo novo
- `PUT` = **atualizar** algo que já existe
- `DELETE` = **apagar**

**REST**
Um estilo de organizar a API onde o endereço é o "substantivo" (o recurso, ex.: `/tournaments`) e o método HTTP é o "verbo". Assim `POST /tournaments` cria um campeonato e `DELETE /tournaments/5` apaga o campeonato 5.

**Requisição (request) e Resposta (response)**
**Requisição** é o pedido que o cliente manda. **Resposta** é o que a API devolve.

**JSON**
Formato de texto para representar dados, parecido com um objeto JavaScript. Ex.: `{ "name": "Copa", "id": 1 }`. É como cliente e API conversam.

**Payload**
Os dados que vão **dentro** de uma requisição (geralmente no corpo de um `POST`/`PUT`). Ex.: ao criar um time, o payload é `{ "name": "Time A" }`.

**Status HTTP**
Um número que resume como o pedido terminou. Os principais aqui:
- `200` OK · `201` criado com sucesso
- `400` você mandou algo errado · `401` não está logado · `403` logado, mas sem permissão · `404` não existe · `409` conflito (ex.: e-mail repetido)
- `500` erro inesperado no servidor

**Envelope de resposta**
O "formato padrão" das respostas desta API: sucesso vem como `{ "data": ... }` (e às vezes `"message"`), e erro vem como `{ "error": "..." }`. Sempre o mesmo formato, para o cliente saber o que esperar.

**CORS**
Regra de segurança do navegador que controla **quais sites** podem chamar a API. Configuramos quais origens (URLs do frontend) são liberadas.

**Rate limit**
Limite de quantas vezes alguém pode chamar uma rota num período. Serve para evitar abuso (ex.: tentar mil senhas no login).

## Backend / código

**Servidor**
O programa que fica "ligado" esperando requisições e respondendo. Aqui é feito com **Express**.

**Middleware**
Uma função que roda **no meio do caminho**, antes do código que responde de fato. Pense num **segurança na porta**: ele confere se você pode entrar (ex.: se está logado) e só então deixa passar. Ex.: o `authMiddleware` confere o token.

**Controller**
O "cozinheiro": é onde fica a lógica de cada endpoint — recebe a requisição, valida, conversa com o banco e monta a resposta.

**Model (modelo)**
A representação de uma tabela do banco em código. Ex.: o model `Tournament` representa a tabela de campeonatos. Usamos models para ler/gravar sem escrever SQL na mão.

**ORM (Sequelize)**
Ferramenta que faz a "tradução" entre objetos do JavaScript e tabelas do banco de dados. Em vez de escrever SQL, você chama `Tournament.findByPk(1)`. **Sequelize** é o ORM usado aqui.

**Migration (migração)**
Um arquivo que descreve uma mudança na estrutura do banco (criar tabela, adicionar coluna...). Rodar as migrations deixa o banco com o formato certo. É como um "histórico versionado" do banco.

**Seeder (seed)**
Script que insere dados iniciais no banco (ex.: criar o usuário administrador padrão). "Semear" o banco.

**Transação**
Um conjunto de operações no banco que acontecem "tudo ou nada": se uma falha, todas são desfeitas. Evita deixar dados pela metade (ex.: apagar um campeonato e seus jogos juntos).

**Cascata (cascade)**
Quando apagar uma coisa apaga também tudo que depende dela. Ex.: apagar um campeonato apaga suas fases, grupos e partidas em cascata.

**Tabela pivô**
Tabela do meio que liga duas outras numa relação "muitos-para-muitos". Aqui, `TournamentTeam` liga campeonatos e times (um time pode estar em vários campeonatos e vice-versa).

**`asyncHandler`**
Um "embrulho" que colocamos em volta de cada função de controller para capturar erros automaticamente e mandar para um tratador central — assim não precisamos escrever `try/catch` em todo lugar.

**Variável de ambiente**
Configuração que fica **fora** do código, no arquivo `.env` (ex.: senha do banco, segredo do token). Permite mudar a config sem mexer no código e não vazar segredos no repositório.

## Autenticação

**Autenticação x Autorização**
**Autenticação** = provar quem você é (login). **Autorização** = o que você pode fazer depois de logado (permissões).

**JWT (JSON Web Token)**
Um "crachá digital" assinado pelo servidor. O cliente o envia em cada pedido para provar que está logado. Como é assinado, o servidor confia que não foi falsificado.

**Token / Access token / Refresh token**
- **Token**: o crachá em si.
- **Access token**: crachá de curta duração (5h) enviado em toda requisição privada.
- **Refresh token**: crachá de longa duração (7 dias) usado **só** para pedir um novo access token quando ele expira. Detalhes em [`../AUTH_DOCS.md`](../AUTH_DOCS.md).

**Hash / bcrypt**
Transformar a senha numa sequência embaralhada e irreversível antes de guardar. Assim, mesmo quem ver o banco não descobre a senha. **bcrypt** é a biblioteca que faz isso.

**Cookie httpOnly**
Um cookie que o JavaScript da página **não consegue ler** — só o navegador o envia automaticamente para a API. Guardamos o refresh token assim para protegê-lo de ataques.

---
> 💡 Faltou algum termo? Vale adicionar aqui — o glossário é vivo.
