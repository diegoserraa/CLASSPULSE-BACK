const XLSX = require("xlsx");
const RankingRepository = require("../repositories/rankingRepository");

// =========================
// Ler XLSX
// =========================
function lerXLSX(caminho) {
  const workbook = XLSX.readFile(caminho);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  return XLSX.utils.sheet_to_json(sheet, {
    defval: ""
  });
}

// =========================
// Formatar data sem timezone
// =========================
function formatarData(date) {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const dia = String(date.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
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
  if (!arquivo_base?.path) {
    throw new Error("arquivo_base inválido");
  }

  if (!arquivo_faltas?.path) {
    throw new Error("arquivo_faltas inválido");
  }

  if (!dias_aula) {
    throw new Error("dias_aula obrigatório");
  }

  // 🔥 comparação segura sem timezone
  if (data_fim < data_inicio) {
    throw new Error("data inválida");
  }

  const alunos = lerXLSX(arquivo_base.path);
  const faltas = lerXLSX(arquivo_faltas.path);

  if (!alunos.length) {
    throw new Error("planilha base vazia");
  }

  if (!faltas.length) {
    throw new Error("planilha faltas vazia");
  }

  const totalAlunos = alunos.length;

  const totalFaltas = faltas.reduce((acc, f) => {
    return acc + Number(f["TT_FALTAS"] || 0);
  }, 0);

  const totalPossivel = totalAlunos * dias_aula;

  const porcentagemPresenca =
    totalPossivel > 0
      ? (
          ((totalPossivel - totalFaltas) * 100) /
          totalPossivel
        ).toFixed(2)
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

  // 🔥 mês atual sem timezone
  if (!dataInicio && !dataFim) {

    const hoje = new Date();

    dataInicio = formatarData(
      new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    );

    dataFim = formatarData(
      new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
    );
  }

  // 🔥 veio apenas início
  if (dataInicio && !dataFim) {

    const [ano, mes] = dataInicio.split("-");

    dataFim = formatarData(
      new Date(Number(ano), Number(mes), 0)
    );
  }

  // 🔥 veio apenas fim
  if (!dataInicio && dataFim) {

    const [ano, mes] = dataFim.split("-");

    dataInicio = formatarData(
      new Date(Number(ano), Number(mes) - 1, 1)
    );
  }

  return await RankingRepository.listarTabela({
    turmaId,
    dataInicio,
    dataFim
  });
}

// =========================
// 🏆 RANKING
// =========================
async function listarRanking(filtros) {
  return await RankingRepository.ranking(filtros);
}

// =========================
// 🗑️ DELETAR
// =========================
async function deletarPorId(id) {

  const deletado =
    await RankingRepository.deletarPorId(id);

  if (!deletado) {
    throw new Error("Registro não encontrado");
  }

  return deletado;
}

module.exports = {
  processarSemana,
  listarTabela,
  listarRanking,
  deletarPorId
};