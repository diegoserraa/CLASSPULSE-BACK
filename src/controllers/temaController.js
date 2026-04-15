const temaService = require('../services/temaService');

async function getTema(req, res) {
  try {
    const tema = await temaService.getTema();

    res.status(200).json({ tema });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function updateTema(req, res) {
  try {
    const { tema } = req.body;

    const result = await temaService.updateTema(tema);

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}


async function streamTema(req, res) {
 res.setHeader("Content-Type", "text/event-stream");
res.setHeader("Cache-Control", "no-cache");
res.setHeader("Connection", "keep-alive");
res.setHeader("Access-Control-Allow-Origin", "*");

  let lastTema = null;

  const sendIfChanged = async () => {
    try {
      const temaAtual = await temaService.getTemaAtivo();

      if (temaAtual && temaAtual !== lastTema) {
        lastTema = temaAtual;

        res.write(`data: ${JSON.stringify({ tema: temaAtual })}\n\n`);
      }
    } catch (err) {
      console.error("Erro no stream:", err);
    }
  };

  // envia inicial
  await sendIfChanged();

  const interval = setInterval(sendIfChanged, 2000);

  req.on("close", () => {
    clearInterval(interval);
  });
};

module.exports = {
  getTema,
  updateTema,
  streamTema,
};