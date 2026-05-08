// src/services/emailService.js

const nodemailer = require('nodemailer');
const validator = require('validator');
const EmailRepository = require('../repositories/emailRepository');

// ========================================
// TRANSPORTER SMTP
// ========================================

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,

  // força IPv4
  family: 4,

  pool: true,
  maxConnections: 2,
  maxMessages: 20,

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },

  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,

  tls: {
    rejectUnauthorized: false,
  },
});

// ========================================
// TRADUZIR ERROS
// ========================================

function traduzirErroEmail(error) {
  const msg = (error.message || '').toLowerCase();

  if (msg.includes('invalid login') || msg.includes('auth')) {
    return 'Falha na autenticação do servidor de email';
  }

  if (
    msg.includes('no recipients') ||
    msg.includes('invalid recipient')
  ) {
    return 'Destinatário inválido ou rejeitado pelo servidor';
  }

  if (
    msg.includes('getaddrinfo') ||
    msg.includes('domain')
  ) {
    return 'Domínio do email não encontrado';
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
// DIVIDIR ARRAY EM LOTES
// ========================================

function chunkArray(array, size) {
  const result = [];

  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }

  return result;
}

// ========================================
// SERVICE
// ========================================

const EmailService = {
  // ========================================
  // ENVIAR EMAILS EM LOTE
  // ========================================

  async enviarEmailsFaltosos(loteId) {
    console.log('===================================');
    console.log('INICIANDO ENVIO DE EMAILS');
    console.log('LOTE:', loteId);
    console.log('===================================');

    const alunos =
      await EmailRepository.getAlunosFaltososPendentes(loteId);

    if (!alunos.length) {
      throw new Error(
        'Nenhum aluno pendente para envio de email neste lote'
      );
    }

    console.log(`TOTAL DE ALUNOS: ${alunos.length}`);

    const resultados = [];

    // envia em grupos pequenos
    const grupos = chunkArray(alunos, 2);

    for (const grupo of grupos) {
      console.log('---------------------------');
      console.log(`ENVIANDO GRUPO (${grupo.length})`);
      console.log('---------------------------');

      const promises = grupo.map(async (aluno) => {
        try {
          console.log(`Enviando email para: ${aluno.email}`);

          // valida email
          if (!validator.isEmail(aluno.email)) {
            throw new Error('Email com formato inválido');
          }

          // envia email
          await transporter.sendMail({
            from: `"Secretaria" <${process.env.EMAIL_USER}>`,
            to: aluno.email,
            subject: 'Aviso de faltas',
            text: `Olá ${aluno.nome}, você tem ${aluno.total_faltas} faltas registradas.`,
          });

          // atualiza banco
          await EmailRepository.atualizarStatusEmail(aluno.id, {
            email_enviado: true,
            erro_email: null,
          });

          console.log(`EMAIL ENVIADO: ${aluno.email}`);

          return {
            aluno: aluno.nome,
            email: aluno.email,
            status: 'ENVIADO',
          };
        } catch (error) {
          console.error(
            `ERRO AO ENVIAR PARA ${aluno.email}:`,
            error.message
          );

          const erroAmigavel =
            error.message === 'Email com formato inválido'
              ? error.message
              : traduzirErroEmail(error);

          // atualiza banco
          await EmailRepository.atualizarStatusEmail(aluno.id, {
            email_enviado: false,
            erro_email: erroAmigavel,
          });

          return {
            aluno: aluno.nome,
            email: aluno.email,
            status: 'FALHA',
            erro: erroAmigavel,
          };
        }
      });

      const resultadoGrupo = await Promise.all(promises);

      resultados.push(...resultadoGrupo);

      // pequena pausa entre grupos
      await new Promise((resolve) =>
        setTimeout(resolve, 1000)
      );
    }

    // ========================================
    // DETECTA FALHA CRÍTICA
    // ========================================

    const falhaCritica =
      resultados.every((r) => r.status === 'FALHA') &&
      resultados.some(
        (r) =>
          r.erro &&
          r.erro.includes(
            'Falha na autenticação do servidor de email'
          )
      );

    if (falhaCritica) {
      throw new Error(
        'Falha crítica no servidor de email: verifique usuário e senha'
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

    let resumo = `Resumo do envio de emails (Lote ${loteId})\n\n`;

    resumo += `✅ ENVIADOS (${enviados.length}):\n`;

    enviados.forEach((r) => {
      resumo += `- ${r.aluno} (${r.email})\n`;
    });

    resumo += `\n❌ FALHAS (${falhas.length}):\n`;

    falhas.forEach((r) => {
      resumo += `- ${r.aluno} (${r.email})\n`;
      resumo += `  Erro: ${r.erro}\n`;
    });

    // ========================================
    // EMAIL RESUMO
    // ========================================

    try {
      await transporter.sendMail({
        from: `"Sistema de Notificação" <${process.env.EMAIL_USER}>`,
        to: 'diegoserra120@hotmail.com',
        subject: `Resumo envio de emails - Lote ${loteId}`,
        text: resumo,
      });

      console.log('EMAIL RESUMO ENVIADO');
    } catch (error) {
      console.error(
        'Erro ao enviar email de resumo:',
        error.message
      );
    }

    console.log('===================================');
    console.log('FINALIZADO ENVIO');
    console.log('===================================');

    return resultados;
  },

  // ========================================
  // REENVIAR EMAIL INDIVIDUAL
  // ========================================

  async reenviarEmailIndividual(alunoId) {
    const aluno = await EmailRepository.getAlunoPorId(alunoId);

    if (!aluno) {
      throw new Error('Aluno não encontrado');
    }

    try {
      console.log(`REENVIANDO EMAIL: ${aluno.email}`);

      if (!validator.isEmail(aluno.email)) {
        throw new Error('Email com formato inválido');
      }

      await transporter.sendMail({
        from: `"Secretaria" <${process.env.EMAIL_USER}>`,
        to: aluno.email,
        subject: 'Reenvio - Aviso de faltas',
        text: `Olá ${aluno.nome}, você tem ${aluno.total_faltas} faltas registradas.`,
      });

      await EmailRepository.atualizarStatusEmail(aluno.id, {
        email_enviado: true,
        erro_email: null,
      });

      console.log(`REENVIO OK: ${aluno.email}`);

      return {
        aluno: aluno.nome,
        email: aluno.email,
        status: 'REENVIADO',
      };
    } catch (error) {
      console.error(
        `ERRO REENVIO ${aluno.email}:`,
        error.message
      );

      const erroAmigavel = traduzirErroEmail(error);

      await EmailRepository.atualizarStatusEmail(aluno.id, {
        email_enviado: false,
        erro_email: erroAmigavel,
      });

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