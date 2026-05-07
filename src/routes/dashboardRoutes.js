// src/routes/dashboardRoutes.js
const express = require("express");
const DashboardController = require("../controllers/dashboardController");
const { verificarToken } = require("../middlewares/authMiddleware");

const router = express.Router();

// GET /dashboard?tipo=semanal|mensal
router.get("/", verificarToken, DashboardController.getDashboard);

module.exports = router; 