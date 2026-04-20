const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const rateLimit = require("express-rate-limit");
const { verificarToken } = require('../middlewares/authMiddleware');

// 🔐 Rate limit SOMENTE no login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas por IP
  message: "Muitas tentativas de login. Tente novamente em 15 minutos."
});

// 🔓 LOGIN (com proteção)
router.post('/login', loginLimiter, authController.login);

// 🔐 ROTAS PROTEGIDAS
router.post('/register', verificarToken, authController.register);

router.get('/users', verificarToken, authController.getUsers);

router.patch('/users/:id/ativo', verificarToken, authController.toggleAtivo);

module.exports = router;