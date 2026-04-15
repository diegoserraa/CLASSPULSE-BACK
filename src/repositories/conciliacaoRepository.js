const pool = require("../database/connection");

// Função genérica para inserir qualquer lista em qualquer tabela
async function inserirRegistros(tabela, colunas, dados) {
  if (!dados.length) return;

  const valores = [];
  const placeholders = [];

  dados.forEach((item, index) => {
    const base = index * colunas.length;

    placeholders.push(
      `(${colunas.map((__, i) => `$${base + i + 1}`).join(",")})`
    );

    valores.push(
      ...colunas.map(col => {
        const valor = item[col];

        // 🔥 CONVERSÃO JSON (CORREÇÃO)
        if (col === "telefones") {
          return JSON.stringify(valor || []);
        }

        return valor;
      })
    );
  });

  const query = `
    INSERT INTO ${tabela} (${colunas.join(",")})
    VALUES ${placeholders.join(",")}
  `;

  await pool.query(query, valores);
}

// Salva alunos encontrados
async function salvarFaltosos(faltosos, lote, turmaId) {
  const dados = faltosos.map(a => ({
    ra: a.ra,
    nome: a.nome,
    email: a.email,
    telefones: a.telefones, // 👈 agora vem como ARRAY
    total_faltas: a.total_faltas,
    lote_importacao: lote,
    turma_id: turmaId
  }));

  await inserirRegistros(
    "alunos_faltosos",
    ["ra", "nome", "email", "telefones", "total_faltas", "lote_importacao", "turma_id"],
    dados
  );
}

// Salva alunos não encontrados
async function salvarNaoEncontrados(erros, lote, turmaId) {
  const dados = erros.map(a => ({
    ra: a.raPlanilhaFaltas || "",
    nome: a.nomePlanilhaFaltas || "",
    total_faltas: a.faltas,
    lote_importacao: lote,
    turma_id: turmaId
  }));

  await inserirRegistros(
    "alunos_faltosos_nao_encontrados",
    ["ra", "nome", "total_faltas", "lote_importacao", "turma_id"],
    dados
  );
}

async function deletarLote(loteId) {
  try {
    await pool.query(
      `DELETE FROM alunos_faltosos WHERE lote_importacao = $1`,
      [loteId]
    );

    await pool.query(
      `DELETE FROM alunos_faltosos_nao_encontrados WHERE lote_importacao = $1`,
      [loteId]
    );

    return { mensagem: 'Lote limpo com sucesso' };
  } catch (err) {
    throw err;
  }
}

async function buscarConciliacoes(filtros) {
  let query = `
    SELECT 
      a.*,
      COALESCE(t.nome_original, 'Sem turma') AS turma_nome
    FROM alunos_faltosos a
    LEFT JOIN turmas t ON t.id = a.turma_id
    WHERE 1=1
  `;

  const values = [];
  let index = 1;

  if (filtros.lote) {
    query += ` AND a.lote_importacao = $${index++}`;
    values.push(filtros.lote);
  }

  if (filtros.turma_id) {
    query += ` AND a.turma_id = $${index++}`;
    values.push(filtros.turma_id);
  }

  if (filtros.email_enviado) {
    query += ` AND a.email_enviado = $${index++}`;
    values.push(filtros.email_enviado === "true");
  }

  if (filtros.data) {
    query += ` AND DATE(a.data_importacao) = $${index++}`;
    values.push(filtros.data);
  }

  if (!filtros.lote && !filtros.data && !filtros.turma_id) {
    query += `
      AND a.lote_importacao = (
        SELECT lote_importacao
        FROM alunos_faltosos
        ORDER BY data_importacao DESC
        LIMIT 1
      )
    `;
  }

  query += " ORDER BY a.data_importacao DESC";

  const result = await pool.query(query, values);
  return result.rows;
}

async function atualizarConciliacao(id, email, telefones) {
  try {
    const result = await pool.query(
      `
      UPDATE alunos_faltosos
      SET 
        email = COALESCE($1, email),
        telefones = COALESCE($2, telefones::jsonb)
      WHERE id = $3
      RETURNING *
      `,
      [email || null, JSON.stringify(telefones) || null, id]
    );

    return result.rows[0];
  } catch (err) {
    throw err;
  }
}

module.exports = {
  salvarFaltosos,
  salvarNaoEncontrados,
  deletarLote,
  buscarConciliacoes,
  atualizarConciliacao
};