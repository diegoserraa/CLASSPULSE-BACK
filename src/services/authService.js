const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const validator = require('validator');
const userRepository = require('../repositories/authRepository');

async function register(nome, email, password) {
  if (!nome || !email || !password) {
    throw new Error('Nome, email e senha são obrigatórios');
  }

  if (!validator.isEmail(email)) {
    throw new Error('Email inválido');
  }

  if (password.length < 8) {
    throw new Error('Senha deve ter no mínimo 8 caracteres');
  }

  const userExists = await userRepository.findByEmail(email);

  if (userExists) {
    throw new Error('Usuário já existe');
  }

  const password_hash = await bcrypt.hash(password, 10);

  const newUser = await userRepository.create({
    nome,
    email,
    password_hash,
    ativo: true,
  });

  return {
    id: newUser.id,
    nome: newUser.nome,
    email: newUser.email,
    ativo: newUser.ativo,
  };
}

async function login(email, password) {
  const user = await userRepository.findByEmail(email);

  if (!user) {
    throw new Error('Usuário não encontrado');
  }

  if (!user.ativo) {
    throw new Error('Usuário inativo');
  }

  const senhaValida = await bcrypt.compare(
    password,
    user.password_hash
  );

  if (!senhaValida) {
    throw new Error('Usuário ou senha inválidos');
  }

  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
  );

  // 👇 retorna dados, NÃO response
  return {
    token,
    user: {
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role,
    },
  };
}

async function getUsers() {
  return await userRepository.findAll();
}

async function toggleAtivo(id, ativo) {
  return await userRepository.updateAtivo(id, ativo);
}

module.exports = {
  register,
  login,
  getUsers,
  toggleAtivo,
};