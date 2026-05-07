// src/controllers/dashboardController.js
const DashboardService = require("../services/dashboardService");

const DashboardController = {
  getDashboard: async (req, res) => {
    try {
      const { tipo = "semanal" } = req.query;

      const dados = await DashboardService.getDashboard(tipo);

      res.json(dados);
    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: err.message });
    }
  }
};

module.exports = DashboardController;