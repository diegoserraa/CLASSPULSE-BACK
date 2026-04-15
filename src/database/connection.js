const { Pool } = require("pg");
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
 
  ssl: { rejectUnauthorized: false }, // obrigatório para Supabase
});
 console.log(process.env.DATABASE_URL)
pool.connect()
  .then(client => {
    console.log("✅ Conexão com Supabase OK!");
    client.release();
  })
  .catch(err => {
    console.error("❌ Erro ao conectar no Supabase:", err.message);
  });

module.exports = pool;