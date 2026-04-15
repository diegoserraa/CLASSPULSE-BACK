const express = require("express");
const multer = require("multer");

const uploadController = require("../controllers/uploadController");

const router = express.Router();

const storage = multer.diskStorage({
  destination: "./uploads",
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage });

router.post(
  "/planilhas",
  upload.fields([
    { name: "alunos" },
    { name: "faltas" }
  ]),
  uploadController.uploadPlanilhas
);

router.delete('/:id', uploadController.deletar);
router.get("/conciliacao", uploadController.buscarConciliacoes);
router.put("/conciliacao/:id", uploadController.atualizarConciliacao);

module.exports = router;