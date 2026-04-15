const db = require('../database/connection');

const EmailRepository = {
  async getAlunosFaltososPendentes(loteId) {
    const query = `
      SELECT id, nome, email, total_faltas
      FROM alunos_faltosos
      WHERE lote_importacao = $1 
      AND (email_enviado IS NULL OR email_enviado = false)
    `;
    const { rows } = await db.query(query, [loteId]);
    return rows;
  },

  async atualizarStatusEmail(alunoId, { email_enviado, erro_email }) {
    const query = `
      UPDATE alunos_faltosos
      SET 
        email_enviado = $1,
        erro_email = $2
      WHERE id = $3
    `;
    await db.query(query, [email_enviado, erro_email, alunoId]);
  },
  async getAlunoPorId(alunoId) {
    const query = `
    SELECT id, nome, email, total_faltas
    FROM alunos_faltosos
    WHERE id = $1
  `;

    const { rows } = await db.query(query, [alunoId]);
    return rows[0];
  }
};

module.exports = EmailRepository;