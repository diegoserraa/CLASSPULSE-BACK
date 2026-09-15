const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === "true"
    ? { require: true, rejectUnauthorized: false }
    : false,
  family: 4, // 🔥 força IPv4 (resolve erro ENETUNREACH)
});

// 🔒 NÃO loga mais a URL completa (segurança)
console.log("Tentando conectar ao banco...");

pool.connect()
  .then(client => {
    console.log("✅ Conexão com o banco OK!");
    client.release();
  })
  .catch(err => {
    console.error("❌ Erro ao conectar no banco:", err.message);
  });

module.exports = pool;