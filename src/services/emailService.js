const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const validator = require('validator');
const EmailRepository = require('../repositories/emailRepository');

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
// CRIAR TRANSPORTER
// ========================================

async function createTransporter() {
  const accessToken = await oauth2Client.getAccessToken();

  return nodemailer.createTransport({
    service: 'gmail',

    auth: {
      type: 'OAuth2',

      user: process.env.EMAIL_USER,

      clientId: process.env.GOOGLE_CLIENT_ID,

      clientSecret:
        process.env.GOOGLE_CLIENT_SECRET,

      refreshToken:
        process.env.GOOGLE_REFRESH_TOKEN,

      accessToken: accessToken.token,
    },
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
    return 'Falha na autenticação Gmail';
  }

  if (
    msg.includes('timeout') ||
    msg.includes('econnrefused') ||
    msg.includes('etimedout') ||
    msg.includes('enetunreach')
  ) {
    return 'Servidor de email indisponível';
  }

  if (
    msg.includes('invalid recipient') ||
    msg.includes('no recipients')
  ) {
    return 'Destinatário inválido';
  }

  return error.message || 'Erro ao enviar email';
}

// ========================================
// SERVICE
// ========================================

const EmailService = {
  // ========================================
  // ENVIAR EMAILS
  // ========================================

  async enviarEmailsFaltosos(loteId) {
    console.log('==============================');
    console.log('INICIANDO ENVIO');
    console.log('LOTE:', loteId);
    console.log('==============================');

    const alunos =
      await EmailRepository.getAlunosFaltososPendentes(
        loteId
      );

    if (!alunos.length) {
      throw new Error(
        'Nenhum aluno pendente para envio'
      );
    }

    console.log('TOTAL:', alunos.length);

    const transporter =
      await createTransporter();

    const resultados = [];

    for (const aluno of alunos) {
      try {
        console.log(
          'ENVIANDO:',
          aluno.email
        );

        // valida email
        if (!validator.isEmail(aluno.email)) {
          throw new Error(
            'Email com formato inválido'
          );
        }

        // envia email
        await transporter.sendMail({
          from: `"Secretaria" <${process.env.EMAIL_USER}>`,
          to: aluno.email,
          subject: 'Aviso de faltas',
          text: `Olá ${aluno.nome}, você tem ${aluno.total_faltas} faltas registradas.`,
        });

        // atualiza banco
        await EmailRepository.atualizarStatusEmail(
          aluno.id,
          {
            email_enviado: true,
            erro_email: null,
          }
        );

        console.log(
          'EMAIL ENVIADO:',
          aluno.email
        );

        resultados.push({
          aluno: aluno.nome,
          email: aluno.email,
          status: 'ENVIADO',
        });
      } catch (error) {
        console.error(
          'ERRO:',
          aluno.email,
          error.message
        );

        const erroAmigavel =
          traduzirErroEmail(error);

        // atualiza banco
        await EmailRepository.atualizarStatusEmail(
          aluno.id,
          {
            email_enviado: false,
            erro_email: erroAmigavel,
          }
        );

        resultados.push({
          aluno: aluno.nome,
          email: aluno.email,
          status: 'FALHA',
          erro: erroAmigavel,
        });
      }

      // pequena pausa
      await new Promise((resolve) =>
        setTimeout(resolve, 100)
      );
    }

    console.log('==============================');
    console.log('FINALIZADO');
    console.log('==============================');

    return resultados;
  },

  // ========================================
  // REENVIAR INDIVIDUAL
  // ========================================

  async reenviarEmailIndividual(alunoId) {
    const aluno =
      await EmailRepository.getAlunoPorId(
        alunoId
      );

    if (!aluno) {
      throw new Error(
        'Aluno não encontrado'
      );
    }

    try {
      const transporter =
        await createTransporter();

      if (!validator.isEmail(aluno.email)) {
        throw new Error(
          'Email com formato inválido'
        );
      }

      await transporter.sendMail({
        from: `"Secretaria" <${process.env.EMAIL_USER}>`,
        to: aluno.email,
        subject:
          'Reenvio - Aviso de faltas',
        text: `Olá ${aluno.nome}, você tem ${aluno.total_faltas} faltas registradas.`,
      });

      await EmailRepository.atualizarStatusEmail(
        aluno.id,
        {
          email_enviado: true,
          erro_email: null,
        }
      );

      return {
        aluno: aluno.nome,
        email: aluno.email,
        status: 'REENVIADO',
      };
    } catch (error) {
      const erroAmigavel =
        traduzirErroEmail(error);

      await EmailRepository.atualizarStatusEmail(
        aluno.id,
        {
          email_enviado: false,
          erro_email: erroAmigavel,
        }
      );

      return {
        aluno: aluno.nome,
        email: aluno.email,
        status: 'FALHA',
        erro: erroAmigavel,
      };
    }
  },
};

module.exports = EmailService;