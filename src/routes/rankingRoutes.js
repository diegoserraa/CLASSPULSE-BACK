const express = require("express");
const multer = require("multer");
const RankingController = require("../controllers/rankingController");
const { verificarToken } = require('../middlewares/authMiddleware');

const router = express.Router();

const storage = multer.diskStorage({
  destination: "./uploads",
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

// Recebe também o número de dias de aula da semana
router.post(
  "/semanal", verificarToken,
  upload.fields([
    { name: "arquivo_base" },
    { name: "arquivo_faltas" }
  ]),
  RankingController.uploadSemana
);

router.get("/tabela", verificarToken,RankingController.listarTabela);

router.get("/", RankingController.listarRanking);

router.delete("/:id", verificarToken, RankingController.deletarLinha);

module.exports = router;