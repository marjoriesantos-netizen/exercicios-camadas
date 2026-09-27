const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

let base = '';

async function request(method, url, body) {
  const res = await fetch(`${base}${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: res.status, body: json };
}

let app;
let model;
let server;

test.before(async () => {
  model = require('../models/products.model');
  app = require('../app');
  if (typeof model._reset === 'function') model._reset();
  server = app.listen(0);
  await new Promise((r) => server.on('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => server.close());

test.beforeEach(() => {
  if (typeof model._reset === 'function') model._reset();
});

function semComentarios(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

test('a estrutura de camadas existe', () => {
  for (const file of [
    'models/products.model.js',
    'controllers/products.controller.js',
    'routes/products.routes.js',
  ]) {
    assert.ok(
      fs.existsSync(path.join(__dirname, '..', file)),
      `falta o arquivo ${file}`,
    );
  }
});

test('o app faz app.use do router de products', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert.match(
    src,
    /app\.use\(\s*['"]\/products['"]\s*,\s*require\(\s*['"][^'"]*routes\/products\.routes['"]\s*\)\s*\)/,
    "esperado: app.use('/products', require('./routes/products.routes'))",
  );
});

test('o app NAO tem mais as rotas /products escritas na mao', () => {
  const src = semComentarios(fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8'));

  assert.doesNotMatch(
    src,
    /app\.(get|post|put|delete|patch)\(\s*['"]\/products/,
    'o app.js ainda tem rota /products na mao',
  );
  assert.doesNotMatch(
    src,
    /const\s+products\s*=\s*\[/,
    'o app.js ainda tem o array de products (o dado e do model agora)',
  );
});

test('NENHUMA regra escrita no route', () => {
  const src = semComentarios(fs.readFileSync(
    path.join(__dirname, '..', 'routes', 'products.routes.js'),
    'utf8',
  ));

  assert.doesNotMatch(src, /\bif\s*\(/, 'o route nao pode ter if');
  assert.doesNotMatch(src, /res\./, 'o route nao pode usar res.');
  assert.doesNotMatch(src, /req\.(body|params|query)/, 'o route nao deve ler req.body/params');
});

test('o route registra as 5 rotas delegando para o controller', () => {
  const src = semComentarios(fs.readFileSync(
    path.join(__dirname, '..', 'routes', 'products.routes.js'),
    'utf8',
  ));

  const esperados = [
    [/router\.get\(\s*['"]\/['"]\s*,/, "router.get('/', ...)"],
    [/router\.get\(\s*['"]\/:id['"]\s*,/, "router.get('/:id', ...)"],
    [/router\.post\(\s*['"]\/['"]\s*,/, "router.post('/', ...)"],
    [/router\.put\(\s*['"]\/:id['"]\s*,/, "router.put('/:id', ...)"],
    [/router\.delete\(\s*['"]\/:id['"]\s*,/, "router.delete('/:id', ...)"],
  ];

  for (const [re, rotulo] of esperados) {
    assert.match(src, re, `faltou ${rotulo}`);
  }

  assert.match(
    src,
    /require\(\s*['"][^'"]*controllers\/products\.controller['"]\s*\)/,
    'o route precisa importar o controller',
  );
  assert.doesNotMatch(
    src,
    /router\.\w+\([^)]*\(req,\s*res\)\s*=>/,
    'o route nao pode declarar handler na mao',
  );
});

test('GET /products retorna a lista', async () => {
  const res = await request('GET', '/products');
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.ok(res.body.length >= 2, 'esperava ao menos os 2 produtos iniciais');
});

test('GET /products/:id retorna 200 e o produto', async () => {
  const res = await request('GET', '/products/1');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.id, 1);
});

test('GET /products/:id inexistente retorna 404', async () => {
  const res = await request('GET', '/products/9999');
  assert.strictEqual(res.status, 404);
});

test('POST /products cria e retorna 201', async () => {
  const res = await request('POST', '/products', { name: 'Monitor 24"', price: 1299.9 });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.name, 'Monitor 24"');
  assert.strictEqual(res.body.price, 1299.9);
  assert.ok(res.body.id);
});

test('POST /products sem name retorna 400', async () => {
  const res = await request('POST', '/products', { price: 10 });
  assert.strictEqual(res.status, 400);
});

test('POST /products com price <= 0 retorna 400', async () => {
  const res = await request('POST', '/products', { name: 'X', price: 0 });
  assert.strictEqual(res.status, 400);
});

test('POST /products com name duplicado retorna 409', async () => {
  const res = await request('POST', '/products', { name: 'Teclado mecanico', price: 10 });
  assert.strictEqual(res.status, 409);
});

test('PUT /products/:id atualiza e retorna 200', async () => {
  const res = await request('PUT', '/products/2', { price: 149.9 });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.price, 149.9);
});

test('PUT /products/:id inexistente retorna 404', async () => {
  const res = await request('PUT', '/products/9999', { price: 10 });
  assert.strictEqual(res.status, 404);
});

test('PUT /products/:id com price invalido retorna 400', async () => {
  const res = await request('PUT', '/products/1', { price: -5 });
  assert.strictEqual(res.status, 400);
});

test('DELETE /products/:id retorna 204 e remove', async () => {
  const del = await request('DELETE', '/products/2');
  assert.strictEqual(del.status, 204);

  const get = await request('GET', '/products/2');
  assert.strictEqual(get.status, 404);
});

test('DELETE /products/:id inexistente retorna 404', async () => {
  const res = await request('DELETE', '/products/9999');
  assert.strictEqual(res.status, 404);
});
