const { Pool } = require("pg");
require("dotenv").config();

const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction
    ? { require: true, rejectUnauthorized: false }
    : false,
  family: 4, // 🔥 força IPv4 (resolve erro ENETUNREACH)
});

// 🔒 NÃO loga mais a URL completa (segurança)
console.log("Tentando conectar ao banco...");

pool.connect()
  .then(client => {
    console.log("✅ Conexão com Supabase OK!");
    client.release();
  })
  .catch(err => {
    console.error("❌ Erro ao conectar no Supabase:", err.message);
  });

module.exports = pool;