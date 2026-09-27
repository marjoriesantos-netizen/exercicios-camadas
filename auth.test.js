const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const FILE = path.join(__dirname, '..', 'services', 'auth.service.js');

function lerArquivo() {
  return fs.readFileSync(FILE, 'utf8');
}

function semComentarios(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

test('services/auth.service.js existe', () => {
  assert.ok(fs.existsSync(FILE), 'falta services/auth.service.js');
});

test('o service exporta authenticate, getProfile e listAll', async () => {
  const auth = require('../services/auth.service');
  assert.strictEqual(typeof auth.authenticate, 'function');
  assert.strictEqual(typeof auth.getProfile, 'function');
  assert.strictEqual(typeof auth.listAll, 'function');
});

test('o service reaproveita o usersModel, sem duplicar dado nem consulta', () => {
  const src = semComentarios(lerArquivo());

  assert.match(
    src,
    /require\(\s*['"][^'"]*models\/users\.model['"]\s*\)/,
    'o service precisa importar models/users.model',
  );
  assert.match(src, /usersModel\.findById\b/, 'falta usersModel.findById');
  assert.match(src, /usersModel\.findByEmail\b/, 'falta usersModel.findByEmail');
  assert.match(src, /usersModel\.findAll\b/, 'falta usersModel.findAll');

  assert.doesNotMatch(src, /readFile|readFileSync|JSON\.parse/, 'nao pode ler arquivo direto');
  assert.doesNotMatch(src, /let\s+users\s*=\s*\[/, 'a lista de usuarios pertence ao model');
});

test('o service compara senha com hash e nunca expoe o hash', async () => {
  const src = semComentarios(lerArquivo());
  assert.match(src, /passwordHash/, 'precisa falar de passwordHash');

  const auth = require('../services/auth.service');
  const ok = await auth.authenticate({ email: 'ana@exemplo.com', password: 'senha123' });
  const errado = await auth.authenticate({ email: 'ana@exemplo.com', password: 'x' });

  assert.strictEqual(ok.error, undefined, 'a senha correta tem que passar');
  assert.strictEqual(errado.error.status, 401, 'a senha errada tem que dar 401');
  assert.strictEqual(ok.user.passwordHash, undefined, 'o hash nao pode vazar no login');
});

test('o service devolve 401 com a mesma mensagem em e-mail inexistente e senha errada', async () => {
  const auth = require('../services/auth.service');

  const inexistente = await auth.authenticate({ email: 'ninguem@exemplo.com', password: 'x' });
  const senhaErrada = await auth.authenticate({ email: 'ana@exemplo.com', password: 'x' });

  assert.strictEqual(inexistente.error.status, 401);
  assert.strictEqual(inexistente.error.message, senhaErrada.error.message);
});

test('NENHUMA resposta vaza o passwordHash', async () => {
  const auth = require('../services/auth.service');

  const login = await auth.authenticate({ email: 'bruno@exemplo.com', password: 'senha456' });
  const perfil = await auth.getProfile(2);
  const lista = await auth.listAll();

  assert.strictEqual(login.user.passwordHash, undefined, 'o login vazou o hash');
  assert.strictEqual(perfil.user.passwordHash, undefined, 'o perfil vazou o hash');
  for (const u of lista.users) {
    assert.strictEqual(u.passwordHash, undefined, 'a lista vazou o hash');
  }
});

test('getProfile com id inexistente devolve 404', async () => {
  const auth = require('../services/auth.service');
  const result = await auth.getProfile(9999);
  assert.strictEqual(result.error.status, 404);
});

test('listAll devolve os 2 usuarios', async () => {
  const auth = require('../services/auth.service');
  const result = await auth.listAll();
  assert.strictEqual(result.users.length, 2);
});

test('o login bem-sucedido devolve um token utilizavel', async () => {
  const auth = require('../services/auth.service');
  const result = await auth.authenticate({ email: 'ana@exemplo.com', password: 'senha123' });

  assert.ok(result.token, 'esperava um token');
  assert.strictEqual(typeof result.token, 'string');
  assert.ok(result.token.includes('.'), 'o token tem que ter a forma de um JWT');
});

test('o service nao conhece a representacao do dado (o que permite trocar o banco)', async () => {
  const auth = require('../services/auth.service');
  const perfil = await auth.getProfile(1);

  assert.strictEqual(typeof perfil.user.id, 'number', 'o service devolve o id que o model devolveu');
  assert.deepStrictEqual(
    Object.keys(perfil.user).sort(),
    ['email', 'id', 'name'],
    'o service devolve o usuario sem mexer no formato',
  );
});
