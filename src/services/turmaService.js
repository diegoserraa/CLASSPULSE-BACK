// services/turmaService.js
const TurmaRepository = require('../repositories/turmaRepository');

const TurmaService = {

  async criarTurma(data) {
    if (!data.nome_original) {
      throw new Error('Nome original da turma é obrigatório');
    }

    return await TurmaRepository.criar(data);
  },

  async listarTurmas() {
    return await TurmaRepository.listar();
  },

  async buscarTurma(id) {
    const turma = await TurmaRepository.buscarPorId(id);

    if (!turma) {
      throw new Error('Turma não encontrada');
    }

    return turma;
  },

  async atualizarTurma(id, data) {
    if (!data.nome_original) {
      throw new Error('Nome original é obrigatório');
    }

    return await TurmaRepository.atualizar(id, data);
  },

  async deletarTurma(id) {
    return await TurmaRepository.deletar(id);
  },

  async atualizarPorcentagem(id, porcentagem) {
    if (porcentagem < 0 || porcentagem > 100) {
      throw new Error('Porcentagem inválida');
    }

    return await TurmaRepository.atualizarPorcentagem(id, porcentagem);
  },
  // Listar turmas para select
  async listarTurmasParaSelect() {
    return await TurmaRepository.listarParaSelect();
  },

  // Alternar ativo/inativo
  async toggleAtivo(id, ativo) {
    if (typeof ativo !== 'boolean') throw new Error('Valor de ativo inválido');
    return await TurmaRepository.toggleAtivo(id, ativo);
  }

};




module.exports = TurmaService;