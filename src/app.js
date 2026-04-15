const express = require("express");
const cors = require("cors");
require('dotenv').config();

const uploadRoutes = require("./routes/uploadRoutes");
const emailRoutes = require("./routes/emailRoutes");
const turmaRoutes = require('./routes/turmaRoutes');
const rankingRoutes = require("./routes/rankingRoutes");
const authRoutes = require('./routes/authRoutes');
const temaRoutes = require('./routes/temaRoutes');

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));


app.use("/upload", uploadRoutes);
app.use('/emails', emailRoutes);
app.use('/turmas', turmaRoutes);
app.use("/ranking", rankingRoutes);
app.use('/auth', authRoutes);
app.use('/tema', temaRoutes); // nova rota para tema


module.exports = app;