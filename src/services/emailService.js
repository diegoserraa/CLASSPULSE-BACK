// src/services/emailService.js
const nodemailer = require('nodemailer');
const validator = require('validator');
const EmailRepository = require('../repositories/emailRepository');
require('dotenv').config();

// Criar transporter uma única vez (reutiliza conexão SMTP)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Função para traduzir erros técnicos em mensagens amigáveis
function traduzirErroEmail(error) {
  const msg = (error.message || '').toLowerCase();
  if (msg.includes('invalid login') || msg.includes('auth')) return 'Falha na autenticação do servidor de email';
  if (msg.includes('no recipients') || msg.includes('invalid recipient')) return 'Destinatário inválido ou rejeitado pelo servidor';
  if (msg.includes('getaddrinfo') || msg.includes('domain')) return 'Domínio do email não encontrado';
  if (msg.includes('timeout') || msg.includes('econnrefused')) return 'Servidor de email indisponível, tente mais tarde';
  return error.message || 'Falha ao enviar email';
}

const EmailService = {
  async enviarEmailsFaltosos(loteId) {
    const alunos = await EmailRepository.getAlunosFaltososPendentes(loteId);

    if (!alunos.length) {
      throw new Error('Nenhum aluno pendente para envio de email neste lote');
    }

    // Envio paralelo de emails
    const promises = alunos.map(async (aluno) => {
      try {
        // ✅ Validação de email antes de enviar
        if (!validator.isEmail(aluno.email)) {
          throw new Error('Email com formato inválido');
        }

        // Envia email
        await transporter.sendMail({
          from: `"Secretaria" <${process.env.EMAIL_USER}>`,
          to: aluno.email,
          subject: 'Aviso de faltas',
          text: `Olá ${aluno.nome}, você tem ${aluno.total_faltas} faltas registradas.`,
        });

        // Atualiza sucesso no banco
        await EmailRepository.atualizarStatusEmail(aluno.id, {
          email_enviado: true,
          erro_email: null,
        });

        return { aluno: aluno.nome, email: aluno.email, status: 'ENVIADO' };

      } catch (error) {
        const erroAmigavel = error.message === 'Email com formato inválido'
          ? error.message
          : traduzirErroEmail(error);

        // Atualiza falha no banco
        await EmailRepository.atualizarStatusEmail(aluno.id, {
          email_enviado: false,
          erro_email: erroAmigavel,
        });

        return { aluno: aluno.nome, email: aluno.email, status: 'FALHA', erro: erroAmigavel };
      }
    });

    const resultados = await Promise.all(promises);

    // 🔹 Detecta falha crítica global (ex.: credenciais erradas)
    const falhaCritica = resultados.every(r => r.status === 'FALHA') &&
                          resultados.some(r => r.erro.includes('Falha na autenticação do servidor de email'));

    if (falhaCritica) {
      throw new Error('Falha crítica no servidor de email: verifique usuário e senha');
    }

    // 🔹 Monta resumo para a secretaria
    const enviados = resultados.filter(r => r.status === 'ENVIADO');
    const falhas = resultados.filter(r => r.status === 'FALHA');

    let resumo = `Resumo do envio de emails (Lote ${loteId})\n\n`;

    resumo += `✅ ENVIADOS (${enviados.length}):\n`;
    enviados.forEach(r => { resumo += `- ${r.aluno} (${r.email})\n`; });

    resumo += `\n❌ FALHAS (${falhas.length}):\n`;
    falhas.forEach(r => { resumo += `- ${r.aluno} (${r.email})\n  Erro: ${r.erro}\n`; });

    // Envia resumo para a secretaria
    try {
      await transporter.sendMail({
        from: `"Sistema de Notificação" <${process.env.EMAIL_USER}>`,
        to: 'diegoserra120@hotmail.com',
        subject: `Resumo envio de emails - Lote ${loteId}`,
        text: resumo,
      });
    } catch (error) {
      console.error('Erro ao enviar email de resumo:', error.message);
    }

    return resultados;
  },
async reenviarEmailIndividual(alunoId) {
  const aluno = await EmailRepository.getAlunoPorId(alunoId);

  if (!aluno) {
    throw new Error('Aluno não encontrado');
  }

  try {
    // valida email
    if (!validator.isEmail(aluno.email)) {
      throw new Error('Email com formato inválido');
    }

    // envia email
    await transporter.sendMail({
      from: `"Secretaria" <${process.env.EMAIL_USER}>`,
      to: aluno.email,
      subject: 'Reenvio - Aviso de faltas',
      text: `Olá ${aluno.nome}, você tem ${aluno.total_faltas} faltas registradas.`,
    });

    // atualiza sucesso
    await EmailRepository.atualizarStatusEmail(aluno.id, {
      email_enviado: true,
      erro_email: null,
    });

    return {
      aluno: aluno.nome,
      email: aluno.email,
      status: 'REENVIADO'
    };

  } catch (error) {
    const erroAmigavel = traduzirErroEmail(error);

    await EmailRepository.atualizarStatusEmail(aluno.id, {
      email_enviado: false,
      erro_email: erroAmigavel,
    });

    return {
      aluno: aluno.nome,
      email: aluno.email,
      status: 'FALHA',
      erro: erroAmigavel
    };
  }
}
};


module.exports = EmailService;