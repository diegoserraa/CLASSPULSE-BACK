const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const rateLimit = require("express-rate-limit");
const { verificarToken } = require('../middlewares/authMiddleware');
const { autorizar } = require('../middlewares/roleMiddleware');
const ROLES = require('../constants/roles');

// 🔐 Rate limit SOMENTE no login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas por IP
  message: "Muitas tentativas de login. Tente novamente em 15 minutos."
});

// 🔓 LOGIN (com proteção)
router.post('/login', loginLimiter, authController.login);

// 🔐 ROTAS PROTEGIDAS (somente ADMIN)
router.post('/register', verificarToken, autorizar(ROLES.ADMIN), authController.register);

router.get('/users', verificarToken, autorizar(ROLES.ADMIN), authController.getUsers);

router.patch('/users/:id/ativo', verificarToken, autorizar(ROLES.ADMIN), authController.toggleAtivo);

module.exports = router;