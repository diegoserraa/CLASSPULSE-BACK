const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

require("dotenv").config();

// Rotas
const uploadRoutes = require("./routes/uploadRoutes");
const emailRoutes = require("./routes/emailRoutes");
const turmaRoutes = require("./routes/turmaRoutes");
const rankingRoutes = require("./routes/rankingRoutes");
const authRoutes = require("./routes/authRoutes");
const temaRoutes = require("./routes/temaRoutes");

const app = express();

// 🔐 Helmet
app.use(
  helmet({
    contentSecurityPolicy: false,
    frameguard: { action: "deny" }
  })
);

// 🔐 CORS
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://classpulse-dun.vercel.app"
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true
  })
);

// 🔧 Config
app.use(express.json({ limit: "2mb" }));

// 📌 Rotas
app.use("/upload", uploadRoutes);
app.use("/emails", emailRoutes);
app.use("/turmas", turmaRoutes);
app.use("/ranking", rankingRoutes);
app.use("/auth", authRoutes);
app.use("/tema", temaRoutes);

// 🚨 Erro
app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    message: "Erro interno no servidor"
  });
});
//router teste
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date()
  });
});

module.exports = app;