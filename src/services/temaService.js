const temaRepository = require('../repositories/temaRepository');

async function getTema() {
  const tema = await temaRepository.getTema();

  if (!tema) {
    throw new Error('Tema não encontrado');
  }

  return tema;
}

async function updateTema(tema) {
  if (!tema) {
    throw new Error('Tema é obrigatório');
  }

  await temaRepository.updateTema(tema);

  return { success: true };
}

async function getTemaAtivo() {
  const result = await temaRepository.getTema();

  return result;
};

module.exports = {
  getTema,
  updateTema,
  getTemaAtivo,
};