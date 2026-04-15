// routes/emailRoutes.js
const express = require('express');
const router = express.Router();
const EmailController = require('../controllers/emailController');
const { verificarToken } = require('../middlewares/authMiddleware');

// POST /emails/lote/:loteId
router.post('/lote/:loteId', verificarToken, EmailController.enviarEmails);
router.post('/reenvio/:alunoId', verificarToken, EmailController.reenviarEmailIndividual);

module.exports = router;