// src/services/rankingService.js
const XLSX = require("xlsx");
const RankingRepository = require("../repositories/rankingRepository");

// =========================
// Ler XLSX
// =========================
function lerXLSX(caminho) {
  const workbook = XLSX.readFile(caminho);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

// =========================
// Processar semana
// =========================
async function processarSemana(
  turmaId,
  data_inicio,
  data_fim,
  arquivo_base,
  arquivo_faltas,
  dias_aula
) {
  if (!arquivo_base?.path) throw new Error("arquivo_base inválido");
  if (!arquivo_faltas?.path) throw new Error("arquivo_faltas inválido");

  if (!dias_aula) throw new Error("dias_aula obrigatório");

  if (new Date(data_fim) < new Date(data_inicio)) {
    throw new Error("data inválida");
  }

  const alunos = lerXLSX(arquivo_base.path);
  const faltas = lerXLSX(arquivo_faltas.path);

  if (!alunos.length) throw new Error("planilha base vazia");
  if (!faltas.length) throw new Error("planilha faltas vazia");

  const totalAlunos = alunos.length;

  const totalFaltas = faltas.reduce(
    (acc, f) => acc + Number(f["TT_FALTAS"] || 0),
    0
  );

  const totalPossivel = totalAlunos * dias_aula;

  const porcentagemPresenca =
    totalPossivel > 0
      ? ((totalPossivel - totalFaltas) * 100 / totalPossivel).toFixed(2)
      : 0;

  const registro = {
    turma_id: turmaId,
    data_inicio,
    data_fim,
    total_alunos: totalAlunos,
    total_faltas: totalFaltas,
    dias_aula,
    porcentagem_presenca: porcentagemPresenca
  };

  await RankingRepository.salvarSemana(registro);

  return registro;
}

// =========================
// 📊 TABELA (GESTOR)
// =========================
async function listarTabela({ turmaId, dataInicio, dataFim }) {
  // Lógica de ajuste de datas
  if (!dataInicio && !dataFim) {
    const hoje = new Date();
    dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];
  }

  if (dataInicio && !dataFim) {
    const inicio = new Date(dataInicio);
    dataFim = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];
  }

  if (!dataInicio && dataFim) {
    const fim = new Date(dataFim);
    dataInicio = new Date(fim.getFullYear(), fim.getMonth(), 1)
      .toISOString()
      .split("T")[0];
  }

  // Chama o repository
  return await RankingRepository.listarTabela({ turmaId, dataInicio, dataFim });
}

// =========================
// 🏆 RANKING
// =========================
async function listarRanking(filtros) {
  return await RankingRepository.ranking(filtros);
}
async function deletarPorId(id) {
  const deletado = await RankingRepository.deletarPorId(id);
  if (!deletado) throw new Error("Registro não encontrado");
  return deletado;
}

module.exports = {
  processarSemana,
  listarTabela,
  listarRanking,
  deletarPorId
};
