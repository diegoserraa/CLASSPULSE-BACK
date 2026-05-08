// src/services/emailService.js

const validator = require('validator');
const EmailRepository = require('../repositories/emailRepository');
const { google } = require('googleapis');

// ========================================
// OAUTH2 GOOGLE
// ========================================

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

// ========================================
// FUNÇÃO GMAIL API (ENVIO REAL)
// ========================================

async function enviarEmailGmailAPI(to, subject, text) {
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const messageParts = [
    `To: ${to}`,
    `From: ${process.env.EMAIL_USER}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'MIME-Version: 1.0',
    `Subject: ${subject}`,
    '',
    text,
  ];

  const message = messageParts.join('\n');

  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  });
}

// ========================================
// SERVICE
// ========================================

const EmailService = {
  async enviarEmailsFaltosos(loteId) {
    console.log('INICIANDO ENVIO (GMAIL API)');

    const alunos =
      await EmailRepository.getAlunosFaltososPendentes(loteId);

    if (!alunos.length) {
      throw new Error('Nenhum aluno pendente');
    }

    const resultados = [];

    for (const aluno of alunos) {
      try {
        console.log('ENVIANDO:', aluno.email);

        if (!validator.isEmail(aluno.email)) {
          throw new Error('Email com formato inválido');
        }

        await enviarEmailGmailAPI(
          aluno.email,
          'Aviso de faltas',
          `Olá ${aluno.nome}, você tem ${aluno.total_faltas} faltas registradas.`
        );

        await EmailRepository.atualizarStatusEmail(aluno.id, {
          email_enviado: true,
          erro_email: null,
        });

        resultados.push({
          aluno: aluno.nome,
          email: aluno.email,
          status: 'ENVIADO',
        });

        console.log('OK:', aluno.email);

      } catch (error) {
        console.error('ERRO ENVIO:', error);

        await EmailRepository.atualizarStatusEmail(aluno.id, {
          email_enviado: false,
          erro_email: error.message || 'Erro ao enviar email',
        });

        resultados.push({
          aluno: aluno.nome,
          email: aluno.email,
          status: 'FALHA',
          erro: error.message || 'Erro ao enviar email',
        });
      }
    }

    console.log('FINALIZADO');

    return resultados;
  },

  async reenviarEmailIndividual(alunoId) {
    const aluno = await EmailRepository.getAlunoPorId(alunoId);

    if (!aluno) {
      throw new Error('Aluno não encontrado');
    }

    try {
      await enviarEmailGmailAPI(
        aluno.email,
        'Reenvio - Aviso de faltas',
        `Olá ${aluno.nome}, você tem ${aluno.total_faltas} faltas registradas.`
      );

      return {
        aluno: aluno.nome,
        email: aluno.email,
        status: 'REENVIADO',
      };

    } catch (error) {
      return {
        aluno: aluno.nome,
        email: aluno.email,
        status: 'FALHA',
        erro: error.message,
      };
    }
  },
};

module.exports = EmailService;