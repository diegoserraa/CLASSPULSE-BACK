// src/controllers/rankingController.js
const RankingService = require("../services/rankingService");

const RankingController = {
  // =========================
  // Upload semanal
  // =========================
  uploadSemana: async (req, res) => {
    try {
      const { turma_id, data_inicio, data_fim, dias_aula } = req.body;

      if (!turma_id) {
        return res.status(400).json({ erro: "turma_id é obrigatório" });
      }

      if (!data_inicio || !data_fim) {
        return res.status(400).json({ erro: "datas obrigatórias" });
      }

      if (new Date(data_fim) < new Date(data_inicio)) {
        return res.status(400).json({ erro: "data_fim inválida" });
      }

      if (!req.files?.arquivo_base || !req.files?.arquivo_faltas) {
        return res.status(400).json({ erro: "arquivos obrigatórios" });
      }

      const resultado = await RankingService.processarSemana(
        parseInt(turma_id),
        data_inicio,
        data_fim,
        req.files.arquivo_base[0],
        req.files.arquivo_faltas[0],
        parseInt(dias_aula)
      );

      res.json({ sucesso: true, resultado });

    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: err.message });
    }
  },

  // =========================
  // 📊 TABELA (GESTOR)
  // =========================
  listarTabela: async (req, res) => {
    try {
      const { turmaId, dataInicio, dataFim } = req.query;

      const dados = await RankingService.listarTabela({
        turmaId: turmaId ? parseInt(turmaId) : null,
        dataInicio,
        dataFim
      });

      res.json(dados);
    } catch (err) {
      res.status(500).json({ erro: err.message });
    }
  },

  // =========================
  // 🏆 RANKING (GAMER)
  // =========================
  listarRanking: async (req, res) => {
    try {
      const { tipo, dataInicio, dataFim } = req.query;

      const dados = await RankingService.listarRanking({
        tipo,
        dataInicio,
        dataFim
      });

      res.json(dados);
    } catch (err) {
      res.status(500).json({ erro: err.message });
    }
  },
  deletarLinha: async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deletado = await RankingService.deletarPorId(id);
    res.json({ sucesso: true, deletado });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
},
};



module.exports = RankingController;