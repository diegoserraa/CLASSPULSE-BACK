const jwt = require('jsonwebtoken');

function verificarToken(req, res, next) {
  const auth = req.headers.authorization;

  // 🔥 Evita cache em rotas autenticadas
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");

  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token = auth.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🔒 Só expõe o necessário
    req.user = {
      id: decoded.id,
      role: decoded.role, // 👈 essencial pro controle de acesso
    };

    next();
  } catch (error) {
    console.error("Erro JWT:", error.message);

    return res.status(401).json({
      error: 'Token inválido ou expirado'
    });
  }
}

module.exports = { verificarToken };