const model = require('../models/users.model');

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function badRequest(message) {
  return { error: { status: 400, message } };
}

function conflict(message) {
  return { error: { status: 409, message } };
}

function notFound(message) {
  return { error: { status: 404, message } };
}

async function createUser(body) {
  const { name, email } = body || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return badRequest('name e obrigatorio');
  }

  if (!email || typeof email !== 'string') {
    return badRequest('email e obrigatorio');
  }

  if (!EMAIL_REGEX.test(email)) {
    return badRequest('email invalido');
  }

  const existente = await model.findByEmail(email);
  if (existente) {
    return conflict('Ja existe um usuario com esse email');
  }

  return model.create({ name, email });
}

async function updateUser(id, body) {
  const { name, email } = body || {};

  const current = await model.findById(id);
  if (!current) {
    return notFound('Usuario nao encontrado');
  }

  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    return badRequest('name e obrigatorio');
  }

  if (email !== undefined) {
    if (typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
      return badRequest('email invalido');
    }

    const owner = await model.findByEmail(email);
    if (owner && owner.id !== current.id) {
      return conflict('Ja existe um usuario com esse email');
    }
  }

  const campos = {};
  if (name !== undefined) campos.name = name;
  if (email !== undefined) campos.email = email;

  return model.update(id, campos);
}

async function listUsers() {
  return { users: await model.findAll() };
}

async function getUser(id) {
  const user = await model.findById(id);

  if (!user) {
    return notFound('Usuario nao encontrado');
  }

  return { user };
}

async function deleteUser(id) {
  const removed = await model.remove(id);

  if (!removed) {
    return notFound('Usuario nao encontrado');
  }

  return { ok: true };
}

module.exports = { listUsers, getUser, createUser, updateUser, deleteUser };
