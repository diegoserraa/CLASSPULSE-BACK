const express = require("express");
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const RankingController = require("../controllers/rankingController");
const { verificarToken } = require('../middlewares/authMiddleware');

const router = express.Router();

const EXTENSOES_PERMITIDAS = [".csv", ".xls", ".xlsx"];

const storage = multer.diskStorage({
  destination: "./uploads",
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!EXTENSOES_PERMITIDAS.includes(ext)) {
      return cb(new Error("Tipo de arquivo não permitido"));
    }
    cb(null, true);
  },
});

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