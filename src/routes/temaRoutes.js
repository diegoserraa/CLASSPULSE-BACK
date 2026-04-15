const express = require('express');
const router = express.Router();

const temaController = require('../controllers/temaController');
const { verificarToken } = require('../middlewares/authMiddleware');

// 🔐 Buscar tema ativo
router.get('/tema-ativo', verificarToken, temaController.getTema);

// 🔐 Atualizar tema (ideal: só ADMIN depois)
router.put('/tema-ativo', verificarToken, temaController.updateTema);

router.get("/stream", temaController.streamTema);

module.exports = router;