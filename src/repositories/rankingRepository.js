// src/repositories/rankingRepository.js
const pool = require("../database/connection");

// =========================
// Salvar ranking semanal
// =========================
async function salvarSemana(registro) {
  const {
    turma_id,
    data_inicio,
    data_fim,
    total_alunos,
    total_faltas,
    dias_aula,
    porcentagem_presenca
  } = registro;

  const query = `
    INSERT INTO ranking_semanal
      (turma_id, data_inicio, data_fim, total_alunos, total_faltas, dias_aula, porcentagem_presenca)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (turma_id, data_inicio)
    DO UPDATE SET
      data_fim = $3,
      total_alunos = $4,
      total_faltas = $5,
      dias_aula = $6,
      porcentagem_presenca = $7
  `;

  await pool.query(query, [
    turma_id,
    data_inicio,
    data_fim,
    total_alunos,
    total_faltas,
    dias_aula,
    porcentagem_presenca
  ]);
}

// =========================
// 📊 TABELA (PAINEL GESTOR)
// =========================
async function listarTabela({ turmaId, dataInicio, dataFim }) {
  const query = `
    SELECT *
    FROM ranking_semanal
    WHERE ($1::int IS NULL OR turma_id = $1)
      AND ($2::date IS NULL OR data_inicio >= $2)
      AND ($3::date IS NULL OR data_fim <= $3)
    ORDER BY data_inicio DESC
  `;

  const result = await pool.query(query, [
    turmaId || null,
    dataInicio || null,
    dataFim || null
  ]);

  return result.rows;
}

// =========================
// 🏆 RANKING (TELA GAMER)
// =========================
async function ranking({ tipo = "semanal", dataInicio, dataFim }) {
  // Se não passar datas, usa mês atual
  if (!dataInicio && !dataFim) {
    const hoje = new Date();
    dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split("T")[0]; // 1º dia do mês
    dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split("T")[0]; // último dia do mês
  }

  // 🔵 SEMANAL – última semana registrada por turma
if (tipo === "semanal") {
  const query = `
    SELECT r.turma_id,
           t.nome_fantasia,
           t.foto_url,
           r.porcentagem_presenca
    FROM ranking_semanal r
    JOIN turmas t ON t.id = r.turma_id
    INNER JOIN (
      SELECT turma_id, MAX(data_inicio) as ultima_data
      FROM ranking_semanal
      GROUP BY turma_id
    ) ult ON ult.turma_id = r.turma_id AND ult.ultima_data = r.data_inicio
    ORDER BY r.porcentagem_presenca DESC
  `;

  const result = await pool.query(query);
  return result.rows;
}
  // 🟣 MENSAL
  const query = `
    SELECT
      r.turma_id,
      t.nome_fantasia,
      t.foto_url,
      ROUND(
        (SUM(r.total_alunos * r.dias_aula) - SUM(r.total_faltas)) * 100.0
        / NULLIF(SUM(r.total_alunos * r.dias_aula), 0),
        2
      ) as porcentagem_presenca
    FROM ranking_semanal r
    JOIN turmas t ON t.id = r.turma_id
    WHERE r.data_inicio >= $1
      AND r.data_fim <= $2
    GROUP BY r.turma_id, t.nome_fantasia, t.foto_url
    ORDER BY porcentagem_presenca DESC
  `;

  const result = await pool.query(query, [dataInicio, dataFim]);
  return result.rows;
}
// Deletar um registro pelo ID
async function deletarPorId(id) {
  if (!id) throw new Error("id é obrigatório");

  const query = `
    DELETE FROM ranking_semanal
    WHERE id = $1
    RETURNING *;
  `;

  const result = await pool.query(query, [id]);
  return result.rows[0]; // retorna o registro deletado
}

async function buscarGraficoSemanal() {
  const query = `
    WITH mes_atual AS (
      SELECT COUNT(*) AS total
      FROM ranking_semanal
      WHERE DATE_TRUNC('month', data_inicio) = DATE_TRUNC('month', CURRENT_DATE)
    ),
    mes_referencia AS (
      SELECT
        CASE
          WHEN (SELECT total FROM mes_atual) > 0
            THEN DATE_TRUNC('month', CURRENT_DATE)
          ELSE DATE_TRUNC('month', MAX(data_inicio))
        END AS mes
      FROM ranking_semanal
    )
    SELECT
      t.nome_fantasia,
      r.data_inicio,
      r.porcentagem_presenca
    FROM ranking_semanal r
    JOIN turmas t
      ON t.id = r.turma_id
    JOIN mes_referencia m
      ON DATE_TRUNC('month', r.data_inicio) = m.mes
    ORDER BY r.data_inicio ASC, r.porcentagem_presenca DESC
  `;

  const result = await pool.query(query);

  return result.rows;
}
// =========================
// 📈 GRÁFICO MENSAL
// =========================

async function buscarGraficoMensal() {

  const query = `
    SELECT

      t.nome_fantasia,

      TO_CHAR(
        r.data_inicio,
        'Mon'
      ) AS mes,

      ROUND(
        (
          SUM(
            (r.total_alunos * r.dias_aula)
            - r.total_faltas
          )::numeric

          /

          NULLIF(
            SUM(r.total_alunos * r.dias_aula),
            0
          )
        ) * 100,
        2
      ) AS presenca_media

    FROM ranking_semanal r

    JOIN turmas t
      ON t.id = r.turma_id

    GROUP BY
      t.nome_fantasia,
      EXTRACT(MONTH FROM r.data_inicio),
      TO_CHAR(r.data_inicio, 'Mon')

    ORDER BY
      t.nome_fantasia,
      EXTRACT(MONTH FROM r.data_inicio);
  `;

  const result = await pool.query(query);

  return result.rows;
};
// src/repositories/rankingRepository.js

async function listarTabelaDashboard(tipo = "semanal") {

  // =========================
  // 🔵 SEMANAL
  // =========================

  if (tipo === "semanal") {

    const query = `
      WITH mes_atual AS (
        SELECT COUNT(*) AS total
        FROM ranking_semanal
        WHERE DATE_TRUNC('month', data_inicio)
          = DATE_TRUNC('month', CURRENT_DATE)
      ),

      mes_referencia AS (
        SELECT
          CASE
            WHEN (SELECT total FROM mes_atual) > 0
              THEN DATE_TRUNC('month', CURRENT_DATE)
            ELSE DATE_TRUNC('month', MAX(data_inicio))
          END AS mes
        FROM ranking_semanal
      ),

      ultima_semana AS (
        SELECT MAX(data_inicio) AS data
        FROM ranking_semanal
        WHERE DATE_TRUNC('month', data_inicio) = (
          SELECT mes FROM mes_referencia
        )
      )

      SELECT *
      FROM ranking_semanal
      WHERE data_inicio = (
        SELECT data FROM ultima_semana
      )
      ORDER BY porcentagem_presenca DESC
    `;

    const result = await pool.query(query);

    return result.rows;
  }

  // =========================
  // 🟣 MENSAL
  // =========================

  const queryMensal = `
    WITH mes_atual AS (
      SELECT COUNT(*) AS total
      FROM ranking_semanal
      WHERE DATE_TRUNC('month', data_inicio)
        = DATE_TRUNC('month', CURRENT_DATE)
    ),

    mes_referencia AS (
      SELECT
        CASE
          WHEN (SELECT total FROM mes_atual) > 0
            THEN DATE_TRUNC('month', CURRENT_DATE)
          ELSE DATE_TRUNC('month', MAX(data_inicio))
        END AS mes
      FROM ranking_semanal
    )

    SELECT *
    FROM ranking_semanal
    WHERE DATE_TRUNC('month', data_inicio) = (
      SELECT mes FROM mes_referencia
    )
    ORDER BY data_inicio DESC
  `;

  const resultMensal =
    await pool.query(queryMensal);

  return resultMensal.rows;
};
async function rankingDashboard(tipo = "semanal") {

  // =========================
  // 🔵 SEMANAL
  // =========================

  if (tipo === "semanal") {

    const query = `
      WITH mes_atual AS (
        SELECT COUNT(*) AS total
        FROM ranking_semanal
        WHERE DATE_TRUNC('month', data_inicio)
          = DATE_TRUNC('month', CURRENT_DATE)
      ),

      mes_referencia AS (
        SELECT
          CASE
            WHEN (SELECT total FROM mes_atual) > 0
              THEN DATE_TRUNC('month', CURRENT_DATE)
            ELSE DATE_TRUNC('month', MAX(data_inicio))
          END AS mes
        FROM ranking_semanal
      ),

      ultima_semana AS (
        SELECT MAX(data_inicio) AS data
        FROM ranking_semanal
        WHERE DATE_TRUNC('month', data_inicio) = (
          SELECT mes FROM mes_referencia
        )
      )

      SELECT
        r.turma_id,
        t.nome_fantasia,

        ROUND(
          r.porcentagem_presenca::numeric,
          1
        ) AS porcentagem_presenca,

        r.total_faltas,

        r.total_alunos,

        1 AS total_semanas

      FROM ranking_semanal r

      JOIN turmas t
        ON t.id = r.turma_id

      JOIN ultima_semana u
        ON r.data_inicio = u.data

      ORDER BY porcentagem_presenca DESC
    `;

    const result = await pool.query(query);

    return result.rows;
  }

  // =========================
  // 🟣 MENSAL
  // =========================

  const queryMensal = `
    WITH mes_atual AS (
      SELECT COUNT(*) AS total
      FROM ranking_semanal
      WHERE DATE_TRUNC('month', data_inicio)
        = DATE_TRUNC('month', CURRENT_DATE)
    ),

    mes_referencia AS (
      SELECT
        CASE
          WHEN (SELECT total FROM mes_atual) > 0
            THEN DATE_TRUNC('month', CURRENT_DATE)
          ELSE DATE_TRUNC('month', MAX(data_inicio))
        END AS mes
      FROM ranking_semanal
    )

    SELECT
      r.turma_id,

      t.nome_fantasia,

      -- 🔥 PRESENÇA PONDERADA
      ROUND(
        (
          (
            SUM(
              r.total_alunos * r.dias_aula
            ) - SUM(r.total_faltas)
          )::numeric

          /

          NULLIF(
            SUM(
              r.total_alunos * r.dias_aula
            ),
            0
          )

        ) * 100,
        1
      ) AS porcentagem_presenca,

      SUM(r.total_faltas) AS total_faltas,

      SUM(r.total_alunos) AS total_alunos,

      COUNT(*) AS total_semanas

    FROM ranking_semanal r

    JOIN turmas t
      ON t.id = r.turma_id

    JOIN mes_referencia m
      ON DATE_TRUNC('month', r.data_inicio) = m.mes

    GROUP BY
      r.turma_id,
      t.nome_fantasia

    ORDER BY porcentagem_presenca DESC
  `;

  const resultMensal =
    await pool.query(queryMensal);

  return resultMensal.rows;
}


module.exports = {
  salvarSemana,
  listarTabela,
  ranking,
  deletarPorId,
  buscarGraficoSemanal,
  buscarGraficoMensal,
  listarTabelaDashboard,
  rankingDashboard
};
