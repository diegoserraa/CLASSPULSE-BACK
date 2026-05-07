// src/services/dashboardService.js

const RankingRepository = require("../repositories/rankingRepository");
const TurmaRepository = require("../repositories/turmaRepository");

async function getDashboard(tipo = "semanal") {

  // =========================
  // 📅 MÊS ATUAL
  // =========================

  const hoje = new Date();

  const dataInicio = new Date(
    hoje.getFullYear(),
    hoje.getMonth(),
    1
  )
    .toISOString()
    .split("T")[0];

  const dataFim = new Date(
    hoje.getFullYear(),
    hoje.getMonth() + 1,
    0
  )
    .toISOString()
    .split("T")[0];

  // =========================
  // 🔥 DADOS
  // =========================

  let ranking = [];
  let tabela = [];
  let turmas = [];

  // =========================
  // 🔵 SEMANAL
  // =========================

  if (tipo === "semanal") {

    [
      ranking,
      tabela,
      turmas
    ] = await Promise.all([

      // 🔥 ranking semanal com fallback
      RankingRepository.rankingDashboard("semanal"),

      // 🔥 tabela semanal com fallback
      RankingRepository.listarTabelaDashboard("semanal"),

      TurmaRepository.listar()
    ]);

  }

  // =========================
  // 🟣 MENSAL
  // =========================

  else {

    [
      ranking,
      tabela,
      turmas
    ] = await Promise.all([

      // 🔥 ranking mensal com fallback
      RankingRepository.rankingDashboard("mensal"),

      // 🔥 tabela mensal com fallback
      RankingRepository.listarTabelaDashboard("mensal"),

      TurmaRepository.listar()
    ]);
  }

  // =========================
  // 🧹 LIMPEZA
  // =========================

  const rankingLimpo = ranking.filter(
    r => r.turma_id && r.nome_fantasia
  );

  // =========================
  // 📈 GRÁFICOS
  // =========================

  let grafico = [];

  // =========================
  // 🔵 SEMANAL
  // =========================

  if (tipo === "semanal") {

    // 🔥 já possui fallback interno
    const dadosSemanais =
      await RankingRepository.buscarGraficoSemanal();

    // Agrupa por turma
    const agrupado = {};

    for (const item of dadosSemanais) {

      if (!agrupado[item.nome_fantasia]) {
        agrupado[item.nome_fantasia] = [];
      }

      agrupado[item.nome_fantasia].push({
        semana: item.data_inicio,
        presenca: Number(item.porcentagem_presenca)
      });
    }

    grafico = Object.entries(agrupado).map(
      ([turma, dados]) => ({
        turma,
        dados
      })
    );

  }

  // =========================
  // 🟣 MENSAL
  // =========================

  else {

    const dadosMensais =
      await RankingRepository.buscarGraficoMensal();

    // 🔥 AGRUPA POR TURMA
    // igual ao semanal

    const agrupado = {};

    for (const item of dadosMensais) {

      if (!agrupado[item.nome_fantasia]) {
        agrupado[item.nome_fantasia] = [];
      }

      agrupado[item.nome_fantasia].push({

        mes: item.mes,

        presenca: Number(
          item.presenca_media
        )
      });
    }

    grafico = Object.entries(agrupado).map(
      ([turma, dados]) => ({
        turma,
        dados
      })
    );
  }

  // =========================
  // 📊 RESUMO
  // =========================

  // 🔥 somente turmas que tiveram dados
  const turmasAtivas =
    new Set(
      tabela.map(t => t.turma_id)
    ).size;

  const totalFaltas = tabela.reduce(
    (acc, t) => acc + Number(t.total_faltas || 0),
    0
  );

  let semanasRegistradas = 0;
  let presencaMedia = 0;

  // =========================
  // 🔥 PRESENÇA PONDERADA
  // =========================
  //
  // presença =
  // ((possíveis - faltas) / possíveis) * 100
  //
  // possíveis = alunos * dias_aula
  //

  let totalPossiveis = 0;
  let totalFaltasPonderado = 0;

  tabela.forEach(item => {

    const faltas =
      Number(item.total_faltas || 0);

    const alunos =
      Number(item.total_alunos || 0);

    const diasAula =
      Number(item.dias_aula || 0);

    const possiveis =
      alunos * diasAula;

    totalPossiveis += possiveis;
    totalFaltasPonderado += faltas;
  });

  if (totalPossiveis > 0) {

    presencaMedia = (
      (
        (totalPossiveis - totalFaltasPonderado)
        / totalPossiveis
      ) * 100
    ).toFixed(1);
  }

  // =========================
  // 📅 SEMANAS REGISTRADAS
  // =========================
if (tipo === "semanal") {

  // 🔥 conta semanas únicas
  semanasRegistradas = new Set(

    grafico.flatMap(turma =>
      turma.dados.map(d =>
        new Date(d.semana)
          .toISOString()
          .split("T")[0]
      )
    )

  ).size;

} else {

  // 🔥 conta meses únicos
  semanasRegistradas = new Set(

    grafico.flatMap(turma =>
      turma.dados.map(d => d.mes)
    )

  ).size;
}

  // =========================
  // 🚨 ALERTAS
  // =========================

  const alertas = [];

  if (rankingLimpo.length > 0) {

    const piorTurma =
      rankingLimpo[rankingLimpo.length - 1];

    alertas.push({
      mensagem:
        `${piorTurma.nome_fantasia} com menor presença: ` +
        `${piorTurma.porcentagem_presenca}%`
    });
  }

  // =========================
  // 📦 RESPONSE FINAL
  // =========================

  return {

    periodo: {
      tipo,
      dataInicio,
      dataFim
    },

    resumo: {
      presencaMedia: Number(presencaMedia),
      faltas: totalFaltas,
      turmasAtivas,
      semanasRegistradas
    },

    ranking: rankingLimpo,

    grafico,

    tabela,

    alertas
  };
}

module.exports = {
  getDashboard
};