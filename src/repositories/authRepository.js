const db = require("../database/connection");
async function findByEmail(email) {
  const query = `
    SELECT * FROM users
    WHERE email = $1
    LIMIT 1
  `;

  try {
    const { rows } = await db.query(query, [email]);
    return rows[0] || null;
  } catch (error) {
    return null;
  }
}

async function create(user) {
  const query = `
    INSERT INTO users (nome, email, password_hash, ativo)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;

  const values = [
    user.nome || null,
    user.email,
    user.password_hash,
    user.ativo ?? true
  ];

  try {
    const { rows } = await db.query(query, values);
    return rows[0];
  } catch (error) {
    throw new Error(error.message);
  }
}

async function findAll() {
  const query = `
    SELECT id, nome, email, ativo, created_at
    FROM users
    ORDER BY created_at DESC
  `;

  try {
    const { rows } = await db.query(query);
    return rows;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function updateAtivo(id, ativo) {
  const query = `
    UPDATE users
    SET ativo = $1
    WHERE id = $2
    RETURNING *
  `;

  try {
    const { rows } = await db.query(query, [ativo, id]);
    return rows[0];
  } catch (error) {
    throw new Error(error.message);
  }
}

module.exports = {
  findByEmail,
  create,
  findAll,
  updateAtivo,
};