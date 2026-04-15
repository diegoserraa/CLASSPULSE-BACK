// controllers/turmaController.js
const TurmaService = require('../services/turmaService');

const TurmaController = {

  async criar(req, res) {
    try {
      const id = await TurmaService.criarTurma(req.body);
      res.status(201).json({ id });
    } catch (err) {
      res.status(400).json({ erro: err.message });
    }
  },

  async listar(req, res) {
    try {
      const turmas = await TurmaService.listarTurmas();
      res.json(turmas);
    } catch (err) {
      res.status(500).json({ erro: err.message });
    }
  },

  async buscar(req, res) {
    try {
      const turma = await TurmaService.buscarTurma(req.params.id);
      res.json(turma);
    } catch (err) {
      res.status(404).json({ erro: err.message });
    }
  },

  async atualizar(req, res) {
    try {
      await TurmaService.atualizarTurma(req.params.id, req.body);
      res.json({ mensagem: 'Turma atualizada' });
    } catch (err) {
      res.status(400).json({ erro: err.message });
    }
  },

  async deletar(req, res) {
    try {
      await TurmaService.deletarTurma(req.params.id);
      res.json({ mensagem: 'Turma removida' });
    } catch (err) {
      res.status(400).json({ erro: err.message });
    }
  },
  // Listar turmas para select (só id + nome_original)
  async listarParaSelect(req, res) {
    try {
      const turmas = await TurmaService.listarTurmasParaSelect();
      res.json(turmas);
    } catch (err) {
      res.status(500).json({ erro: err.message });
    }
  },

  // Ativar/Inativar turma
  async toggleAtivo(req, res) {
    try {
      const { id } = req.params;
      const { ativo } = req.body; // true = ativar, false = inativar
      await TurmaService.toggleAtivo(id, ativo);
      res.json({ mensagem: `Turma ${ativo ? 'ativada' : 'inativada'}` });
    } catch (err) {
      res.status(400).json({ erro: err.message });
    }
  }

};



module.exports = TurmaController;