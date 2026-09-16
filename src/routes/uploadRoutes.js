const express = require("express");
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const uploadController = require("../controllers/uploadController");
const { verificarToken } = require("../middlewares/authMiddleware");

const router = express.Router();

const EXTENSOES_PERMITIDAS = [".csv", ".xls", ".xlsx"];

const storage = multer.diskStorage({
  destination: "./uploads",
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
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
  }
});

router.post(
  "/planilhas",
  verificarToken,
  upload.fields([
    { name: "alunos" },
    { name: "faltas" }
  ]),
  uploadController.uploadPlanilhas
);

router.delete('/:id', verificarToken, uploadController.deletar);
router.get("/conciliacao", verificarToken, uploadController.buscarConciliacoes);
router.put("/conciliacao/:id", verificarToken, uploadController.atualizarConciliacao);

module.exports = router;