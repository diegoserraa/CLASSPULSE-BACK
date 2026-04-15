const express = require('express');
const router = express.Router();
const TurmaController = require('../controllers/turmaController');
const { verificarToken } = require('../middlewares/authMiddleware');

// Rotas CRUD
router.post('/', express.json({ limit: "5mb" }), verificarToken, TurmaController.criar);
router.get('/', verificarToken, TurmaController.listar);

// Rotas estáticas especiais (devem vir antes das dinâmicas)
router.get('/select', verificarToken, TurmaController.listarParaSelect); // só id + nome_original
router.patch('/:id/ativo', verificarToken, TurmaController.toggleAtivo);  // ativar/inativar turma

// Rotas dinâmicas (/:id) sempre por último
router.get('/:id', verificarToken, TurmaController.buscar);
router.put('/:id',express.json({ limit: "5mb" }), verificarToken, TurmaController.atualizar);
router.delete('/:id', verificarToken, TurmaController.deletar);

module.exports = router;