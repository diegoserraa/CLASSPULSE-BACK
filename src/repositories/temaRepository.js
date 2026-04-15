const db = require("../database/connection");

async function getTema() {
  const query = `
    SELECT tema
    FROM tema_ativo
    WHERE id = 1
  `;

  try {
    const { rows } = await db.query(query);
    return rows[0]?.tema || null;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function updateTema(tema) {
  const query = `
    UPDATE tema_ativo
    SET tema = $1
    WHERE id = 1
  `;

  try {
    await db.query(query, [tema]);
  } catch (error) {
    throw new Error(error.message);
  }
}


module.exports = {
  getTema,
  updateTema,
};