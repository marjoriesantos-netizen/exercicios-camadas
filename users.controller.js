const service = require('../services/users.service');

async function listUsers(req, res) {
  const result = await service.listUsers();
  return res.status(200).json(result.users);
}

async function getUser(req, res) {
  const result = await service.getUser(req.params.id);

  if (result.error) {
    return res.status(result.error.status).json({ error: result.error.message });
  }

  return res.status(200).json(result.user);
}

async function createUser(req, res) {
  const result = await service.createUser(req.body);

  if (result.error) {
    return res.status(result.error.status).json({ error: result.error.message });
  }

  return res.status(201).json(result.user);
}

async function updateUser(req, res) {
  const result = await service.updateUser(req.params.id, req.body);

  if (result.error) {
    return res.status(result.error.status).json({ error: result.error.message });
  }

  return res.status(200).json(result.user);
}

async function deleteUser(req, res) {
  const result = await service.deleteUser(req.params.id);

  if (result.error) {
    return res.status(result.error.status).json({ error: result.error.message });
  }

  return res.status(204).send();
}

module.exports = { listUsers, getUser, createUser, updateUser, deleteUser };
