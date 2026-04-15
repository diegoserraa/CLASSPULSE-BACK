const authService = require('../services/authService');

async function register(req, res) {
  try {
    const { nome, email, password } = req.body;

    const result = await authService.register(nome, email, password);

    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    const result = await authService.login(email, password);

    res.status(200).json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
}

async function getUsers(req, res) {
  try {
    const users = await authService.getUsers();
    res.status(200).json(users);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function toggleAtivo(req, res) {
  try {
    const { id } = req.params;
    const { ativo } = req.body;

    const result = await authService.toggleAtivo(id, ativo);

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

module.exports = {
  register,
  login,
  getUsers,
  toggleAtivo,
};