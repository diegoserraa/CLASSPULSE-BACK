const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const XLSX = require("xlsx");
const { v4: uuidv4 } = require("uuid");
const conciliacaoRepository = require("../repositories/conciliacaoRepository");

// =========================
// NORMALIZAR CHAVE
// =========================
function normalizarChave(chave) {
  return String(chave || "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toUpperCase();
}

// =========================
// DETECTAR CSV SEPARADOR
// =========================
function detectarSeparador(linha) {
  const virgulas = (linha.match(/,/g) || []).length;
  const pontoVirgula = (linha.match(/;/g) || []).length;
  return pontoVirgula > virgulas ? ";" : ",";
}

// =========================
// LEITOR UNIVERSAL
// =========================
function lerArquivo(caminho) {
  const ext = path.extname(caminho).toLowerCase();

  if (ext === ".csv") return lerCSV(caminho);
  if (ext === ".xls" || ext === ".xlsx") return lerXLSX(caminho);

  throw new Error(`Formato não suportado: ${ext}`);
}

// =========================
// CSV
// =========================
function lerCSV(caminho) {
  return new Promise((resolve, reject) => {
    const resultados = [];
    let separador = null;
    let headers = null;
    let buffer = "";

    const stream = fs.createReadStream(caminho, { encoding: "utf8" });

    stream.on("data", (chunk) => {
      buffer += chunk.toString();

      const linhas = buffer.split(/\r?\n/);
      buffer = linhas.pop();

      for (const linha of linhas) {
        if (!linha.trim()) continue;

        if (!headers) {
          separador = detectarSeparador(linha);

          headers = linha
            .replace(/^\uFEFF/, "")
            .split(separador)
            .map(normalizarChave);

          continue;
        }

        const valores = linha.split(separador);

        const obj = {};
        headers.forEach((h, i) => {
          obj[h] = valores[i] ?? "";
        });

        const temConteudo = Object.values(obj).some(
          (v) => v !== undefined && v !== null && String(v).trim() !== ""
        );

        if (temConteudo) resultados.push(obj);
      }
    });

    stream.on("end", () => resolve(resultados));
    stream.on("error", reject);
  });
}

// =========================
// XLS / XLSX
// =========================
function lerXLSX(caminho) {
  const workbook = XLSX.readFile(caminho, {
    cellDates: true,
    raw: false,
  });

  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  const json = XLSX.utils.sheet_to_json(sheet, {
    defval: "",
    raw: false,
  });

  return json.map((row) => {
    const obj = {};

    Object.keys(row).forEach((k) => {
      obj[normalizarChave(k)] = row[k];
    });

    return obj;
  });
}

// =========================
// RA MATCH (SEM ZERO)
// =========================
function normalizarRA(ra) {
  if (ra === null || ra === undefined) return "";

  const somenteNumeros = String(ra)
    .replace(",", ".")
    .replace(/\.0+$/, "")
    .replace(/\D/g, "");

  if (!somenteNumeros) return "";

  return String(Number(somenteNumeros));
}

// =========================
// NOME
// =========================
function normalizarNome(nome) {
  if (!nome) return "";

  return String(nome)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9 ]/gi, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

// =========================
// GET CAMPO
// =========================
function getCampo(obj, campos) {
  for (const campo of campos) {
    if (obj[campo] !== undefined && obj[campo] !== null && obj[campo] !== "") {
      return obj[campo];
    }
  }
  return "";
}

// =========================
// LIMPAR TELEFONE
// =========================
function limparNumero(numero) {
  return String(numero || "").replace(/\D/g, "");
}

// =========================
// TELEFONES ESTRUTURADOS
// =========================
function extrairTelefones(aluno) {
  const campos = [
    "TELEFONE 1",
    "TELEFONE 1 RESPONSAVEL ACADEMICO",
    "TELEFONE ALUNO 2"
  ];

  const telefones = [];

  for (const campo of campos) {
    const valor = getCampo(aluno, [campo]);

    if (valor && String(valor).trim() !== "") {
      telefones.push({
        label: campo,
        numero: limparNumero(valor), // 🔥 limpa número
      });
    }
  }

  return telefones;
}

// =========================
// MAIN
// =========================
async function conciliarERegistrar(alunosPath, faltasPath, turmaId) {
  const alunos = await lerArquivo(alunosPath);
  const faltas = await lerArquivo(faltasPath);

  const turmaIdNumber = Number(turmaId);
  if (!turmaIdNumber) throw new Error("Turma inválida");

  const mapaRA = {};
  const mapaNome = [];
  const listaAlunos = [];

  // INDEX
  for (const aluno of alunos) {
    const raBruto = getCampo(aluno, ["RA ALUNO", "RA", "MATRICULA"]);
    const nomeBruto = getCampo(aluno, ["ALUNO NOME", "NOME"]);

    const raMatch = normalizarRA(raBruto);
    const nomeNorm = normalizarNome(nomeBruto);

    if (!raMatch || !nomeNorm) continue;

    const registro = {
      ...aluno,
      nomeOriginal: nomeBruto,
      nomeNorm,
      raMatch,
      telefones: extrairTelefones(aluno), // 👈 ARRAY LIMPO
    };

    mapaRA[raMatch] = registro;
    mapaNome.push(registro);
    listaAlunos.push(registro);
  }

  const faltosos = [];
  const naoEncontrados = [];
  const encontradosRA = new Set();

  for (const falta of faltas) {
    const totalFaltas = Number(
      getCampo(falta, ["TT_FALTAS", "FALTAS", "TOTAL"])
    );

    if (!totalFaltas || totalFaltas < 2) continue;

    const raFaltaBruto = getCampo(falta, ["RA", "MATRICULA"]);
    const nomeFaltaBruto = getCampo(falta, ["NOME", "ALUNO"]);

    const raFalta = normalizarRA(raFaltaBruto);
    const nomeFalta = normalizarNome(nomeFaltaBruto);

    let aluno = null;

    if (raFalta) aluno = mapaRA[raFalta];

    // 🔥 VALIDAÇÃO FORTE
    if (aluno && aluno.nomeNorm !== nomeFalta) {
      aluno = null;
    }

    if (!aluno && nomeFalta) {
      aluno = mapaNome.find((a) => a.nomeNorm === nomeFalta);
    }

    if (aluno && aluno.raMatch) {
      if (!encontradosRA.has(aluno.raMatch)) {
        faltosos.push({
          ra: String(raFaltaBruto || ""),
          nome: aluno.nomeOriginal,
          email: getCampo(aluno, ["E-MAIL", "EMAIL"]),
          telefones: aluno.telefones || [], // 👈 ARRAY (CORRETO)
          total_faltas: totalFaltas,
        });

        encontradosRA.add(aluno.raMatch);
      }
    } else {
      naoEncontrados.push({
        raPlanilhaFaltas: raFaltaBruto || "",
        nomePlanilhaFaltas: nomeFaltaBruto || "",
        faltas: totalFaltas,
      });
    }
  }

  const lote = uuidv4();

  await conciliacaoRepository.salvarFaltosos(
    faltosos,
    lote,
    turmaIdNumber
  );

  await conciliacaoRepository.salvarNaoEncontrados(
    naoEncontrados,
    lote,
    turmaIdNumber
  );

  return {
    totalAlunosPlanilha: listaAlunos.length,
    totalRegistrosFaltas: faltas.length,
    totalFaltosos: faltosos.length,
    faltosos,
    naoEncontrados,
    lote_importacao: lote,
  };
}










async function deletarLote(id) {
  return await conciliacaoRepository.deletarLote(id);
}
async function buscarConciliacoes(filtros) {
  return await conciliacaoRepository.buscarConciliacoes(filtros);
}
async function atualizarConciliacao(id, email, telefones) {
  if (!id) throw new Error("ID inválido");

  // 🔥 regra de negócio
  return await conciliacaoRepository.atualizarConciliacao(
    id,
    email,
    telefones
  );
}


module.exports = {
  conciliarERegistrar,
  deletarLote,
  buscarConciliacoes,
  atualizarConciliacao

};