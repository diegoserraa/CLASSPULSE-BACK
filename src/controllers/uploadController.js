const conciliacaoService = require("../services/conciliacaoService");

exports.uploadPlanilhas = async (req, res) => {

  try {

    const alunosPath = req.files["alunos"][0].path;
    const faltasPath = req.files["faltas"][0].path;
    const turmaId = req.body.turma_id;
    console.log("Turma ID recebida:", turmaId);

    const resultado = await conciliacaoService.conciliarERegistrar(
      alunosPath,
      faltasPath,
      turmaId
    );

    res.json(resultado);

  } catch (error) {

    res.status(500).json({
      error: "Erro ao processar planilhas"
    });

  };


};
exports.deletar = async (req, res) => {
  try {
    const { id } = req.params;

    // Validação simples
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ erro: 'ID do lote inválido' });
    }

    const resultado = await conciliacaoService.deletarLote(id);
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};
exports.buscarConciliacoes = async (req, res) => {
  try {
    const filtros = req.query;

    const dados = await conciliacaoService.buscarConciliacoes(filtros);

    res.json(dados);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};
exports.atualizarConciliacao = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, telefones } = req.body;

    if (!id) {
      return res.status(400).json({ message: "ID obrigatório" });
    }

    const resultado = await conciliacaoService.atualizarConciliacao(
      id,
      email,
      telefones
    );

    res.json({
      message: "Registro atualizado com sucesso",
      data: resultado,
    });

  } catch (err) {
    res.status(500).json({
      message: err.message || "Erro ao atualizar registro",
    });
  }
};