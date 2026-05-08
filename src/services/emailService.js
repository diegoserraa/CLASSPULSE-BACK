// src/services/emailService.js

const nodemailer = require('nodemailer');
const validator = require('validator');
const EmailRepository = require('../repositories/emailRepository');

// ========================================
// TRANSPORTER SMTP
// ========================================

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,

  // força IPv4
  family: 4,

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },

  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 5000,

  tls: {
    rejectUnauthorized: false,
  },
});

// ========================================
// VERIFICA CONEXÃO SMTP
// ========================================

transporter.verify((error) => {
  if (error) {
    console.error('ERRO SMTP:', error);
  } else {
    console.log('SMTP GOOGLE CONECTADO');
  }
});

// ========================================
// TRADUZIR ERROS
// ========================================

function traduzirErroEmail(error) {
  const msg = (error.message || '').toLowerCase();

  if (
    msg.includes('invalid login') ||
    msg.includes('auth')
  ) {
    return 'Falha na autenticação do servidor de email';
  }

  if (
    msg.includes('no recipients') ||
    msg.includes('invalid recipient')
  ) {
    return 'Destinatário inválido ou rejeitado pelo servidor';
  }

  if (
    msg.includes('timeout') ||
    msg.includes('econnrefused') ||
    msg.includes('etimedout') ||
    msg.includes('enetunreach')
  ) {
    return 'Servidor de email indisponível, tente mais tarde';
  }

  return error.message || 'Falha ao enviar email';
}

// ========================================
// SERVICE
// ========================================

const EmailService = {
  // ========================================
  // ENVIAR EMAILS
  // ========================================

  async enviarEmailsFaltosos(loteId) {
    console.log('===================================');
    console.log('INICIANDO ENVIO');
    console.log('LOTE:', loteId);
    console.log('===================================');

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

    const resultados = [];

    // ========================================
    // ENVIO SEQUENCIAL
    // ========================================

    for (const aluno of alunos) {
      try {
        console.log('ENVIANDO:', aluno.email);

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

        console.log('ENVIADO:', aluno.email);

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
          error.message ===
          'Email com formato inválido'
            ? error.message
            : traduzirErroEmail(error);

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
        setTimeout(resolve, 300)
      );
    }

    // ========================================
    // RESUMO
    // ========================================

    const enviados = resultados.filter(
      (r) => r.status === 'ENVIADO'
    );

    const falhas = resultados.filter(
      (r) => r.status === 'FALHA'
    );

    let resumo = `Resumo envio lote ${loteId}\n\n`;

    resumo += `ENVIADOS (${enviados.length})\n`;

    enviados.forEach((r) => {
      resumo += `- ${r.aluno}\n`;
    });

    resumo += `\nFALHAS (${falhas.length})\n`;

    falhas.forEach((r) => {
      resumo += `- ${r.aluno}\n`;
      resumo += `Erro: ${r.erro}\n\n`;
    });

    // ========================================
    // EMAIL RESUMO
    // ========================================

    try {
      await transporter.sendMail({
        from: `"Sistema" <${process.env.EMAIL_USER}>`,
        to: 'diegoserra120@hotmail.com',
        subject: `Resumo lote ${loteId}`,
        text: resumo,
      });

      console.log('RESUMO ENVIADO');
    } catch (error) {
      console.error(
        'ERRO RESUMO:',
        error.message
      );
    }

    console.log('===================================');
    console.log('FINALIZADO');
    console.log('===================================');

    return resultados;
  },

  // ========================================
  // REENVIAR INDIVIDUAL
  // ========================================

  async reenviarEmailIndividual(alunoId) {
    const aluno =
      await EmailRepository.getAlunoPorId(alunoId);

    if (!aluno) {
      throw new Error('Aluno não encontrado');
    }

    try {
      if (!validator.isEmail(aluno.email)) {
        throw new Error(
          'Email com formato inválido'
        );
      }

      await transporter.sendMail({
        from: `"Secretaria" <${process.env.EMAIL_USER}>`,
        to: aluno.email,
        subject: 'Reenvio - Aviso de faltas',
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