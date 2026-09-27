# 3 Exercícios — Camadas (model / controller / service / route)

Node + Express puro, sem framework de teste (usa o `node:test` nativo).
Todos os arquivos já estão com a **solução completa e comentada** — o
enunciado de cada um está no topo do arquivo, e os testes são o critério de
pronto verificado.

## Rodar

```bash
npm install          # só instala o express
npm test             # 51 testes, deve passar tudo
npm run test:1       # só o exercício 1 (17 testes)
npm run test:2       # só o exercício 2 (21 testes)
npm run test:3       # só o exercício 3 (13 testes)
npm run start:1      # sobe o app na porta 3000
```

## Os 3 exercícios

| | Pasta | O que resolve | Testes |
|---|---|---|---|
| 1 (fácil) | `exercicio-1-facil/` | `/products` do monólito para camadas | 17 |
| 2 (médio) | `exercicio-2-medio/` | `users.service.js` com 409 e 404 | 21 |
| 3 (difícil) | `exercicio-3-dificil/` | `auth.service.js` + as 3 frases | 13 |

## O mapa das camadas

```
app.js
  └─ app.use('/products', routes)      ← só liga o prefixo
       └─ routes/products.routes.js    ← SÓ method + path + controller
            └─ controllers/…controller  ← HTTP: req → status, res ← json
                 └─ services/…service  ← REGRA DE NEGÓCIO (409, 404…)
                      └─ models/…model ← dados (e validação de campo)
```

A seta só anda para baixo. Se o controller precisar do model, o problema é
um service faltando — não um `require` faltando.

---

### 1. (Fácil) — Migrar `/products` para camadas

**Enunciado:** criar `models/products.model.js`,
`controllers/products.controller.js`, `routes/products.routes.js` e o
`app.use` correspondente. **Critério de pronto:** as mesmas rotas de antes
funcionando, sem nenhuma regra escrita no route.

O que a solução faz:

- O array `products` e todas as regras saem do `app.js` e vão para o model.
  O `app.js` inteiro fica com **duas linhas**: `express()` e o `app.use`.
- O model devolve `{ error: { status, message } }` em vez de lançar `throw`,
  porque ele não deve saber de HTTP. Ele diz "deu erro de negócio X" e o
  controller traduz X para 400 / 404 / 409.
- O arquivo de rotas tem 5 linhas e nenhum `if`. Os testes verificam os dois
  lados: que as rotas respondem igual antes (`200/201/204/400/404/409`) e que
  o arquivo de rotas **não tem** `if`, `res.`, `req.body` nem handler anônimo.

Detalhe que costuma errar: **o prefixo `/products` não vai no router**. Ele
fica no `app.use`, então dentro do router o index é `router.get('/')`.

### 2. (Médio) — `services/users.service.js`

**Enunciado:** `createUser` que **rejeita e-mail duplicado com 409** e
`updateUser` que **rejeita id inexistente com 404**. O controller chama o
service em vez do model.

A diferença em relação ao exercício 1: aqui o model **não valida nada** —
devolve `null` quando não acha, e quem decide que esse `null` significa 409
ou 404 é o service. O status HTTP é decidido na camada do serviço.

Dois testes leem o **código-fonte** em vez de chamar a API, porque é a
arquitetura que precisa ser provada:

- `o controller de users NAO importa o model direto` — falha se houver
  qualquer `require` de `models/` no controller.
- `o service usa o model` — falha se o service não importar o model.

O `listUsers` / `getUser` / `deleteUser` existem no service (o enunciado só
pedia `createUser` e `updateUser`) porque o teste proíbe o controller de ler
do model. Eles são uma fachada fina: não inventam regra, mas centralizam o
acesso aos dados.

**Pegadinha que o teste cobra:** atualizar o usuário 1 mantendo o próprio
e-mail não pode dar 409. Só é conflito se o e-mail pertence a **outro** id —
daí o `owner.id !== current.id`.

### 3. (Difícil) — `auth.service.js` e a troca por MongoDB

**Enunciado:** esboce como um `auth.service.js` reutilizaria
`usersModel.findById`/`findAll` para autenticar, e explique em 3 frases o que
acontece com esse service ao trocar JSON por MongoDB.

O enunciado aceitava rascunho comentado, e as 3 frases estão no fim do
`auth.service.js`. Mas como o resto do projeto roda, o service está
**funcional**: `authenticate` (401), `getProfile` (404) e `listAll`, com
bcrypt e JWT simulados — o model é in-memory e não tem hash real nem chave.

O teste mais útil do projeto inteiro é o
`cobertura do enunciado: nenhum ponto esquecido`. Ele quebra o enunciado nos
8 pontos obrigatórios e **imprime na tela qual ficou de fora**:

```
faltaram estes pontos do enunciado:
 - MongoDB: service/controller nao mudam
```

---

## Erros que os testes cobrem

Estão lá porque são os que mais aparecem:

- `if (!p) return res.status(404)` **dentro do route** → regra no lugar errado.
- Controller dando `require` no model → pula a camada do service.
- `409` no `updateUser` disparando para o próprio e-mail do usuário.
- Devolver o `user` inteiro no perfil → **vaza o `passwordHash`**.
- "e-mail não encontrado" vs "senha incorreta" em respostas diferentes →
  confirma quais e-mails existem na base. O teste
  `authenticate com e-mail inexistente devolve 401 (e a MESMA mensagem)`
  existe exatamente para pegar isso.
- `await` esquecido quando trocar por MongoDB.

## Estrutura

```
exercicios-camadas/
├── package.json
├── README.md
├── exercicio-1-facil/
│   ├── app.js                              ← 2 linhas: express + app.use
│   ├── models/products.model.js            ← dados + regras
│   ├── controllers/products.controller.js  ← req/res
│   ├── routes/products.routes.js           ← 5 linhas, zero if
│   └── test/products.test.js               ← 17 testes
├── exercicio-2-medio/
│   ├── app.js
│   ├── models/{users,products}.model.js    ← users é "burro", sem validação
│   ├── services/users.service.js           ← 409 e 404 moram aqui
│   ├── controllers/users.controller.js     ← só chama o service
│   ├── routes/users.routes.js
│   └── test/users.test.js                  ← 21 testes
└── exercicio-3-dificil/
    ├── app.js
    ├── models/users.model.js               ← com passwordHash
    ├── services/auth.service.js            ← funcional + as 3 frases no fim
    ├── controllers/auth.controller.js
    ├── routes/auth.routes.js
    └── test/auth.test.js                   ← 13 testes
```

## Testar na mão

```bash
npm run start:1
# em outro terminal:
curl http://localhost:3000/products
curl -X POST http://localhost:3000/products -H "Content-Type: application/json" -d '{"name":"Monitor","price":1299.9}'
curl -X POST http://localhost:3000/products -H "Content-Type: application/json" -d '{"name":"Monitor","price":1299.9}'   # 409
```

```bash
npm run start:2
curl -X POST http://localhost:3000/users -H "Content-Type: application/json" -d '{"name":"Carla","email":"ana@exemplo.com"}'  # 409
curl -X PUT http://localhost:3000/users/9999 -H "Content-Type: application/json" -d '{"name":"Fantasma"}'                      # 404
```

```bash
npm run start:3
curl -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" -d '{"email":"ana@exemplo.com","password":"senha123"}'
curl http://localhost:3000/auth/profile/1
curl http://localhost:3000/auth/users
```

Os dados são in-memory: cada `npm start` recomeça do zero.
