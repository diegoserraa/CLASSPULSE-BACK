// src/services/emailService.js

const nodemailer = require('nodemailer');
const validator = require('validator');
const EmailRepository = require('../repositories/emailRepository');
const { google } = require('googleapis');
const dns = require('dns');

// ========================================
// FORÇAR IPV4 (CRÍTICO PARA RENDER)
// ========================================
dns.setDefaultResultOrder('ipv4first');

// ========================================
// OAUTH2 GOOGLE
// ========================================

const OAuth2 = google.auth.OAuth2;

const oauth2Client = new OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

// ========================================
// CRIAR TRANSPORTER (CORRIGIDO)
// ========================================

async function createTransporter() {
  const accessTokenResponse =
    await oauth2Client.getAccessToken();

  const accessToken = accessTokenResponse.token;

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,

    auth: {
      type: 'OAuth2',
      user: process.env.EMAIL_USER,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
      accessToken,
    },

    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
  });
}

// ========================================
// TRADUZIR ERROS
// ========================================

function traduzirErroEmail(error) {
  const msg = (error.message || '').toLowerCase();

  if (
    msg.includes('invalid login') ||
    msg.includes('auth')
  ) {
    return 'Falha autenticação Google';
  }

  if (
    msg.includes('timeout') ||
    msg.includes('econnrefused') ||
    msg.includes('etimedout')
  ) {
    return 'Servidor email indisponível';
  }

  if (msg.includes('enetreach') || msg.includes('enetunreach')) {
    return 'Falha de conexão de rede (Render/Gmail)';
  }

  return error.message || 'Erro ao enviar email';
}

// ========================================
// SERVICE
// ========================================

const EmailService = {
  async enviarEmailsFaltosos(loteId) {
    console.log('INICIANDO ENVIO');

    const alunos =
      await EmailRepository.getAlunosFaltososPendentes(loteId);

    if (!alunos.length) {
      throw new Error('Nenhum aluno pendente');
    }

    const transporter = await createTransporter();

    const resultados = [];

    for (const aluno of alunos) {
      try {
        console.log('ENVIANDO:', aluno.email);

        if (!validator.isEmail(aluno.email)) {
          throw new Error('Email com formato inválido');
        }

        await transporter.sendMail({
          from: `"Secretaria" <${process.env.EMAIL_USER}>`,
          to: aluno.email,
          subject: 'Aviso de faltas',
          text: `Olá ${aluno.nome}, você tem ${aluno.total_faltas} faltas registradas.`,
        });

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

        const erroAmigavel = traduzirErroEmail(error);

        await EmailRepository.atualizarStatusEmail(aluno.id, {
          email_enviado: false,
          erro_email: erroAmigavel,
        });

        resultados.push({
          aluno: aluno.nome,
          email: aluno.email,
          status: 'FALHA',
          erro: erroAmigavel,
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

    const transporter = await createTransporter();

    try {
      await transporter.sendMail({
        from: `"Secretaria" <${process.env.EMAIL_USER}>`,
        to: aluno.email,
        subject: 'Reenvio - Aviso de faltas',
        text: `Olá ${aluno.nome}, você tem ${aluno.total_faltas} faltas registradas.`,
      });

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
        erro: traduzirErroEmail(error),
      };
    }
  },
};

module.exports = EmailService;