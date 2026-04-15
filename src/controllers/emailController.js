const EmailService = require('../services/emailService');

const EmailController = {
  async enviarEmails(req, res) {
    const { loteId } = req.params;

    try {
      const resultados = await EmailService.enviarEmailsFaltosos(loteId);

      const falhaCritica = resultados.every(r => r.status === 'FALHA') &&
        resultados.some(r => r.erro && r.erro.includes('Falha na autenticação do servidor de email'));

      if (falhaCritica) {
        return res.status(500).json({
          message: 'Falha crítica no servidor de email: verifique usuário e senha',
          resultados
        });
      }

      res.status(200).json({
        message: 'Emails enviados com sucesso',
        resultados
      });

    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  },

  // 🔥 NOVO CONTROLLER
  async reenviarEmailIndividual(req, res) {
    const { alunoId } = req.params;

    try {
      const resultado = await EmailService.reenviarEmailIndividual(alunoId);

      return res.status(200).json({
        message: 'Email reenviado com sucesso',
        resultado
      });

    } catch (error) {
      return res.status(500).json({
        message: error.message,
      });
    }
  }
};

module.exports = EmailController;