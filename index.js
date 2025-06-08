require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { Telegraf } = require('telegraf');
const app = express();
app.use(express.json());

const bot = new Telegraf(process.env.BOT_TOKEN);
const MP_TOKEN = process.env.ACCESS_TOKEN_MP;

const messageStore = {}; // Armazena mensagens por usuário

// Gera link Pix com QRCode + Copia e Cola
bot.start(async (ctx) => {
  try {
    const payment = await axios.post('https://api.mercadopago.com/v1/payments', {
      transaction_amount: 47,
      description: 'Acesso ao curso Clone com IA',
      payment_method_id: 'pix',
      payer: { email: `${ctx.chat.id}@mail.com` },
      metadata: { telegram_id: ctx.chat.id }
    }, {
      headers: {
        'Authorization': `Bearer ${MP_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const qr = payment.data.point_of_interaction.transaction_data.qr_code_base64;
    const pix = payment.data.point_of_interaction.transaction_data.qr_code;

    const msg = await ctx.replyWithPhoto(
      { source: Buffer.from(qr, 'base64') },
      {
        caption: `🧾 *Pagamento via PIX*\n\n💵 Valor: R$47,00\n📌 Copie e cole o código abaixo no seu app bancário:\n\`\`\`\n${pix}\n\`\`\``,
        parse_mode: 'Markdown'
      }
    );

    messageStore[ctx.chat.id] = msg.message_id;

  } catch (err) {
    console.error(err.response?.data || err.message);
    ctx.reply('❌ Erro ao gerar cobrança Pix.');
  }
});

// Webhook Mercado Pago
app.post('/webhook', async (req, res) => {
  const { action, data } = req.body;

  if (action === 'payment.created') {
    try {
      const p = await axios.get(`https://api.mercadopago.com/v1/payments/${data.id}`, {
        headers: { Authorization: `Bearer ${MP_TOKEN}` }
      });

      if (p.data.status === 'approved') {
        const tel = p.data.metadata.telegram_id;
        const prevMsgId = messageStore[tel];

        if (prevMsgId) {
          await bot.telegram.deleteMessage(tel, prevMsgId);
          delete messageStore[tel];
        }

        await bot.telegram.sendMessage(tel,
          `✅ *Pagamento aprovado!*\n\n🎓 Aqui está seu acesso ao curso:\n🔗 https://drive.google.com/drive/folders/1LK6fpV6EBucTNbGiI10vjDZWqHlkkP9b?usp=drive_link`,
          { parse_mode: 'Markdown' }
        );
      }

    } catch (e) {
      console.error('Erro ao processar pagamento:', e.message);
    }
  }

  res.sendStatus(200);
});

bot.launch();
app.listen(process.env.PORT || 4000, () =>
  console.log('mp-payment-bot online')
);
