// repositories/turmaRepository.js
const db = require('../database/connection'); // seu pool do pg

const TurmaRepository = {

  // Criar nova turma
  async criar({ nome_original, nome_fantasia, foto_url }) {
    const result = await db.query(
      `INSERT INTO turmas (nome_original, nome_fantasia, foto_url)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [nome_original, nome_fantasia || null, foto_url || null]
    );

    return result.rows[0].id;
  },

  // Listar todas as turmas
  async listar() {
    const result = await db.query(
      `SELECT id, nome_original, nome_fantasia, foto_url, porcentagem_faltas, ativo
       FROM turmas
       ORDER BY nome_original`
    );

    return result.rows;
  },

  // Buscar turma por ID
  async buscarPorId(id) {
    const result = await db.query(
      `SELECT * FROM turmas WHERE id = $1`,
      [id]
    );

    return result.rows[0];
  },

  // Atualizar turma
  async atualizar(id, { nome_original, nome_fantasia, foto_url }) {
    await db.query(
      `UPDATE turmas
       SET 
         nome_original = $1,
         nome_fantasia = $2,
         foto_url = $3
       WHERE id = $4`,
      [nome_original, nome_fantasia || null, foto_url || null, id]
    );
  },

  // Deletar turma
  async deletar(id) {
    await db.query(
      `DELETE FROM turmas WHERE id = $1`,
      [id]
    );
  },

  // Atualizar porcentagem de faltas
  async atualizarPorcentagem(id, porcentagem) {
    await db.query(
      `UPDATE turmas
       SET porcentagem_faltas = $1
       WHERE id = $2`,
      [porcentagem, id]
    );
  },
   // Listar só turmas ativas para dropdown
  async listarParaSelect() {
    const result = await db.query(
      `SELECT id, nome_original
       FROM turmas
       WHERE ativo = TRUE
       ORDER BY nome_original`
    );
    return result.rows;
  },

  // Alternar ativo/inativo
  async toggleAtivo(id, ativo) {
  const result = await db.query(
    `UPDATE turmas
     SET ativo = $1
     WHERE id = $2
     RETURNING id`,
    [ativo, id]
  );

  if (result.rowCount === 0) {
    throw new Error('Turma não encontrada');
  }

  return result.rows[0];
}

};




module.exports = TurmaRepository;