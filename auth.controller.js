const authService = require('../services/auth.service');

async function login(req, res) {
  const result = await authService.authenticate(req.body);

  if (result.error) {
    return res.status(result.error.status).json({ error: result.error.message });
  }

  return res.status(200).json({ user: result.user, token: result.token });
}

async function profile(req, res) {
  const result = await authService.getProfile(req.params.id);

  if (result.error) {
    return res.status(result.error.status).json({ error: result.error.message });
  }

  return res.status(200).json(result.user);
}

async function list(req, res) {
  const result = await authService.listAll();
  return res.status(200).json(result.users);
}

module.exports = { login, profile, list };
