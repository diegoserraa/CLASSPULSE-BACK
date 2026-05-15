// src/repositories/rankingRepository.js

const pool = require("../database/connection");

// =========================
// 📅 FORMATAR DATA
// =========================
function formatarData(date) {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const dia = String(date.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

// =========================
// 📅 PEGAR MÊS ATUAL
// =========================
function obterMesAtual() {

  const hoje = new Date();

  return {
    inicio: formatarData(
      new Date(
        hoje.getFullYear(),
        hoje.getMonth(),
        1
      )
    ),

    fim: formatarData(
      new Date(
        hoje.getFullYear(),
        hoje.getMonth() + 1,
        0
      )
    )
  };
}

// =========================
// 💾 SALVAR RANKING SEMANAL
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
    INSERT INTO ranking_semanal (
      turma_id,
      data_inicio,
      data_fim,
      total_alunos,
      total_faltas,
      dias_aula,
      porcentagem_presenca
    )

    VALUES (
      $1,
      $2::date,
      $3::date,
      $4,
      $5,
      $6,
      $7
    )

    ON CONFLICT (turma_id, data_inicio)

    DO UPDATE SET
      data_fim = EXCLUDED.data_fim,
      total_alunos = EXCLUDED.total_alunos,
      total_faltas = EXCLUDED.total_faltas,
      dias_aula = EXCLUDED.dias_aula,
      porcentagem_presenca = EXCLUDED.porcentagem_presenca
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
async function listarTabela({
  turmaId,
  dataInicio,
  dataFim
}) {

  const query = `
    SELECT
      id,
      turma_id,

      TO_CHAR(
        data_inicio,
        'YYYY-MM-DD'
      ) AS data_inicio,

      TO_CHAR(
        data_fim,
        'YYYY-MM-DD'
      ) AS data_fim,

      total_alunos,
      total_faltas,
      porcentagem_presenca,
      criado_em,
      dias_aula

    FROM ranking_semanal

    WHERE
      ($1::int IS NULL OR turma_id = $1)

      AND (
        $2::date IS NULL
        OR data_inicio >= $2::date
      )

      AND (
        $3::date IS NULL
        OR data_inicio <= $3::date
      )

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
async function ranking({
  tipo = "semanal",
  dataInicio,
  dataFim
}) {

  // 🔥 MÊS ATUAL SEM TIMEZONE
  if (!dataInicio && !dataFim) {

    const datas = obterMesAtual();

    dataInicio = datas.inicio;
    dataFim = datas.fim;
  }

  // =========================
  // 🔵 SEMANAL
  // =========================

  if (tipo === "semanal") {

    const query = `
      SELECT
    r.turma_id,
    t.nome_fantasia,
    t.foto_url,

    ROUND(
      r.porcentagem_presenca::numeric,
      2
    ) AS porcentagem_presenca

FROM ranking_semanal r

JOIN turmas t
  ON t.id = r.turma_id

WHERE r.data_inicio = (
    SELECT MAX(data_inicio)
    FROM ranking_semanal
)

ORDER BY porcentagem_presenca DESC;
    `;

    const result = await pool.query(query);

    return result.rows;
  }

  // =========================
  // 🟣 MENSAL
  // =========================

  const query = `
    SELECT
      r.turma_id,

      t.nome_fantasia,

      t.foto_url,

      ROUND(
        (
          (
            SUM(
              r.total_alunos * r.dias_aula
            ) - SUM(r.total_faltas)
          ) * 100.0
        )

        /

        NULLIF(
          SUM(
            r.total_alunos * r.dias_aula
          ),
          0
        ),

        2
      ) AS porcentagem_presenca

    FROM ranking_semanal r

    JOIN turmas t
      ON t.id = r.turma_id

    WHERE
      r.data_inicio BETWEEN $1::date AND $2::date

    GROUP BY
      r.turma_id,
      t.nome_fantasia,
      t.foto_url

    ORDER BY porcentagem_presenca DESC
  `;

  const result = await pool.query(query, [
    dataInicio,
    dataFim
  ]);

  return result.rows;
}

// =========================
// 🗑️ DELETAR
// =========================
async function deletarPorId(id) {

  if (!id) {
    throw new Error("id é obrigatório");
  }

  const query = `
    DELETE FROM ranking_semanal
    WHERE id = $1
    RETURNING *
  `;

  const result = await pool.query(query, [id]);

  return result.rows[0];
}

// =========================
// 📈 GRÁFICO SEMANAL
// =========================
async function buscarGraficoSemanal() {

  const query = `
    WITH mes_atual AS (

      SELECT COUNT(*) AS total

      FROM ranking_semanal

      WHERE DATE_TRUNC(
        'month',
        data_inicio
      ) = DATE_TRUNC(
        'month',
        CURRENT_DATE
      )
    ),

    mes_referencia AS (

      SELECT
        CASE
          WHEN (
            SELECT total
            FROM mes_atual
          ) > 0

          THEN DATE_TRUNC(
            'month',
            CURRENT_DATE
          )

          ELSE DATE_TRUNC(
            'month',
            MAX(data_inicio)
          )
        END AS mes

      FROM ranking_semanal
    )

    SELECT
      t.nome_fantasia,

      r.data_inicio,

      ROUND(
        r.porcentagem_presenca::numeric,
        2
      ) AS porcentagem_presenca

    FROM ranking_semanal r

    JOIN turmas t
      ON t.id = r.turma_id

    JOIN mes_referencia m
      ON DATE_TRUNC(
        'month',
        r.data_inicio
      ) = m.mes

    ORDER BY
      r.data_inicio ASC,
      porcentagem_presenca DESC
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
            (
              r.total_alunos
              * r.dias_aula
            ) - r.total_faltas
          )::numeric

          /

          NULLIF(
            SUM(
              r.total_alunos
              * r.dias_aula
            ),
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
      EXTRACT(
        MONTH FROM r.data_inicio
      ),
      TO_CHAR(
        r.data_inicio,
        'Mon'
      )

    ORDER BY
      t.nome_fantasia,
      EXTRACT(
        MONTH FROM r.data_inicio
      )
  `;

  const result = await pool.query(query);

  return result.rows;
}

// =========================
// 📊 DASHBOARD TABELA
// =========================
async function listarTabelaDashboard(
  tipo = "semanal"
) {

  // =========================
  // 🔵 SEMANAL
  // =========================

  if (tipo === "semanal") {

    const query = `
      WITH mes_atual AS (

        SELECT COUNT(*) AS total

        FROM ranking_semanal

        WHERE DATE_TRUNC(
          'month',
          data_inicio
        ) = DATE_TRUNC(
          'month',
          CURRENT_DATE
        )
      ),

      mes_referencia AS (

        SELECT
          CASE

            WHEN (
              SELECT total
              FROM mes_atual
            ) > 0

            THEN DATE_TRUNC(
              'month',
              CURRENT_DATE
            )

            ELSE DATE_TRUNC(
              'month',
              MAX(data_inicio)
            )

          END AS mes

        FROM ranking_semanal
      ),

      ultima_semana AS (

        SELECT
          MAX(data_inicio) AS data

        FROM ranking_semanal

        WHERE DATE_TRUNC(
          'month',
          data_inicio
        ) = (
          SELECT mes
          FROM mes_referencia
        )
      )

      SELECT *

      FROM ranking_semanal

      WHERE data_inicio = (
        SELECT data
        FROM ultima_semana
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

      WHERE DATE_TRUNC(
        'month',
        data_inicio
      ) = DATE_TRUNC(
        'month',
        CURRENT_DATE
      )
    ),

    mes_referencia AS (

      SELECT
        CASE

          WHEN (
            SELECT total
            FROM mes_atual
          ) > 0

          THEN DATE_TRUNC(
            'month',
            CURRENT_DATE
          )

          ELSE DATE_TRUNC(
            'month',
            MAX(data_inicio)
          )

        END AS mes

      FROM ranking_semanal
    )

    SELECT *

    FROM ranking_semanal

    WHERE DATE_TRUNC(
      'month',
      data_inicio
    ) = (
      SELECT mes
      FROM mes_referencia
    )

    ORDER BY data_inicio DESC
  `;

  const resultMensal =
    await pool.query(queryMensal);

  return resultMensal.rows;
}

// =========================
// 🏆 DASHBOARD RANKING
// =========================
async function rankingDashboard(
  tipo = "semanal"
) {

  // =========================
  // 🔵 SEMANAL
  // =========================

  if (tipo === "semanal") {

    const query = `
      WITH mes_atual AS (

        SELECT COUNT(*) AS total

        FROM ranking_semanal

        WHERE DATE_TRUNC(
          'month',
          data_inicio
        ) = DATE_TRUNC(
          'month',
          CURRENT_DATE
        )
      ),

      mes_referencia AS (

        SELECT
          CASE

            WHEN (
              SELECT total
              FROM mes_atual
            ) > 0

            THEN DATE_TRUNC(
              'month',
              CURRENT_DATE
            )

            ELSE DATE_TRUNC(
              'month',
              MAX(data_inicio)
            )

          END AS mes

        FROM ranking_semanal
      ),

      ultima_semana AS (

        SELECT
          MAX(data_inicio) AS data

        FROM ranking_semanal

        WHERE DATE_TRUNC(
          'month',
          data_inicio
        ) = (
          SELECT mes
          FROM mes_referencia
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

      WHERE DATE_TRUNC(
        'month',
        data_inicio
      ) = DATE_TRUNC(
        'month',
        CURRENT_DATE
      )
    ),

    mes_referencia AS (

      SELECT
        CASE

          WHEN (
            SELECT total
            FROM mes_atual
          ) > 0

          THEN DATE_TRUNC(
            'month',
            CURRENT_DATE
          )

          ELSE DATE_TRUNC(
            'month',
            MAX(data_inicio)
          )

        END AS mes

      FROM ranking_semanal
    )

    SELECT
      r.turma_id,

      t.nome_fantasia,

      ROUND(
        (
          (
            SUM(
              r.total_alunos
              * r.dias_aula
            ) - SUM(r.total_faltas)
          )::numeric

          /

          NULLIF(
            SUM(
              r.total_alunos
              * r.dias_aula
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
      ON DATE_TRUNC(
        'month',
        r.data_inicio
      ) = m.mes

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