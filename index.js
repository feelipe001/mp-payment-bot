require('dotenv').config();
const { Telegraf } = require('telegraf');
const express = require('express');
const axios = require('axios');

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();
app.use(express.json());

const usuarios = new Map();

// /start → envia sua copy e gera PIX dinâmico
bot.start(async (ctx) => {
  try {
    await ctx.deleteMessage();

    const txid = `curso-${ctx.from.id}-${Date.now()}`;
    // Cria cobrança PIX dinâmica
    await axios.put(
      `https://api.mercadopago.com/v1/cob/pix/${txid}`,
      {
        calendario: { expiracao: 600 },
        valor: { original: '47.00' },
        chave: process.env.MP_CHAVE_PIX,
        solicitacaoPagador: 'Pagamento do curso Clone com IA'
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.ACCESS_TOKEN_MP}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Busca dados da cobrança
    const { data } = await axios.get(
      `https://api.mercadopago.com/v1/cob/pix/${txid}`,
      { headers: { Authorization: `Bearer ${process.env.ACCESS_TOKEN_MP}` } }
    );

    // Envia QR Code + código copia e cola
    const qrMsg = await ctx.replyWithPhoto(
      { url: data.imagemQrcode },
      {
        caption:
          `🚀 Bem-vindo ao *Elite Creator Bot*!\n\n` +
          `Aqui você aprende a criar fotos impossíveis com IA – direto no seu celular, com 1 clique.\n\n` +
          `📸 Curso disponível: *Clone com IA*\n` +
          `💰 Investimento: R$47 (acesso vitalício)\n\n` +
          `➡️ Escaneie o QR Code acima ou copie o código:\n\`\`\`${data.qrCode}\`\`\`\n\n` +
          `⏰ Você tem *10 minutos* para efetuar o pagamento via PIX.`,
        parse_mode: 'Markdown'
      }
    );

    // Armazena dados pra apagar a mensagem depois
    usuarios.set(`msg_${ctx.from.id}`, qrMsg.message_id);
    usuarios.set(`txid_${ctx.from.id}`, txid);
  } catch (err) {
    console.error('Erro ao gerar PIX dinâmico:', err.response?.data || err.message);
    await ctx.reply('❌ Erro ao gerar cobrança PIX. Tente novamente.');
  }
});

// Webhook Mercado Pago
app.post('/webhook', async (req, res) => {
  const pixEvent = req.body; 
  // Confirmação pode vir de endpoint /v2/webhook, adapte conforme JSON
  const txid = pixEvent.data?.txid || pixEvent.data?.id;
  if (!txid) return res.sendStatus(400);

  try {
    // Consulta status da cobrança
    const { data: info } = await axios.get(
      `https://api.mercadopago.com/v1/cob/pix/${txid}`,
      { headers: { Authorization: `Bearer ${process.env.ACCESS_TOKEN_MP}` } }
    );

    if (info.status === 'CONCLUIDA') {
      const userId = txid.split('-')[1];
      const chatId = usuarios.get(`msg_${userId}`) && await futures.resolveCtxReplyId(await bot.telegram.getChat(userId), usuarios.get(`msg_${userId}`)) // placeholder
      const pixMsgId = usuarios.get(`msg_${userId}`);
      
      // Apagar QR Code
      if (pixMsgId) {
        await bot.telegram.deleteMessage(userId, pixMsgId);
      }

      // Envia liberação do curso
      await bot.telegram.sendMessage(
        userId,
        `🔥 Pagamento recebido, liberação em andamento...\n\n` +
        `⏰ Pode levar até *5 minutos* para liberar o curso. Aguarde!\n\n` +
        `✅ *Curso liberado com sucesso!*\n\n` +
        `📚 *Nome do Curso:* Clone com IA\n` +
        `💰 *Valor pago:* R$47,00\n` +
        `🔓 *Acesso:* Vitalício\n\n` +
        `🚀 *Obrigado pela preferência!*`,
        { parse_mode: 'Markdown' }
      );

      // Envia link de acesso
      await bot.telegram.sendMessage(
        userId,
        `🔗 Aqui está seu link de acesso:\nhttps://drive.google.com/drive/folders/1LK6fpV6EBucTNbGiTi0vJDZwqHlkkP9b?usp=drive_link`,
        { disable_web_page_preview: true }
      );

      usuarios.delete(`msg_${userId}`);
      usuarios.delete(`txid_${userId}`);
    }
    res.sendStatus(200);
  } catch (err) {
    console.error('Erro no webhook PIX:', err.message);
    res.sendStatus(500);
  }
});

// Servidor
app.listen(process.env.PORT || 4000, () => console.log('Rodando...'));

// Lançar bot
bot.launch();
