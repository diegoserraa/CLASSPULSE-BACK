const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verificarToken } = require('../middlewares/authMiddleware');

router.post('/register', verificarToken, authController.register);
router.post('/login', authController.login);

// NOVAS ROTAS
router.get('/users', verificarToken, authController.getUsers);
router.patch('/users/:id/ativo', verificarToken, authController.toggleAtivo);

module.exports = router;