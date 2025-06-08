const express = require('express');
const { Telegraf } = require('telegraf');
const axios = require('axios');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();

app.use(express.json());

const usuarios = new Map();

bot.start(async (ctx) => {
  const chatId = ctx.chat.id;
  usuarios.set(chatId, ctx.from.id);

  await bot.telegram.sendPhoto(chatId, {
    source: 'ia_exemplo.jpg'
  }, {
    caption:
`🎨 *Veja a qualidade que você vai alcançar com a IA:*

📱 Criar fotos impossíveis, com realismo profissional.

🔒 *Ideal para perfis, carrosséis, portfólios e até negócios.*

🔥 Bem-vindo ao *Elite Creator Bot*!`,
    parse_mode: 'Markdown'
  });

  await bot.telegram.sendMessage(chatId,
` A partir de agora seus conteúdos estarão em outro nível!

Aqui você aprende a criar *fotos ultra realistas com IA*.

📸 Curso disponível: *Clone com IA*  
💰 Investimento: *R$47,00 (acesso vitalício)*
📥 O link do curso será liberado após você clicar no botão abaixo

Clique no botão abaixo para garantir seu acesso agora:`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💳 Pagar agora (Pix)', callback_data: 'pagar' }]
        ]
      }
    });
});

bot.on('callback_query', async (ctx) => {
  const chatId = ctx.from.id;
  const data = ctx.callbackQuery.data;

  if (data === 'pagar') {
    gerarPagamentoPix(chatId);
  }
});

async function gerarPagamentoPix(chatId) {
  try {
    const response = await axios.post(
      'https://api.mercadopago.com/v1/payments',
      {
        transaction_amount: 47,
        description: 'Curso Clone com IA',
        payment_method_id: 'pix',
        payer: {
          email: `${chatId}@elitebot.com`,
          first_name: 'Cliente',
          last_name: 'Telegram'
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.ACCESS_TOKEN_MP}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `${chatId}-${Date.now()}`
        }
      }
    );

    const pixData = response.data;
    const codigoPix = pixData.point_of_interaction.transaction_data.qr_code;
    const paymentId = response.data.id;

    await bot.telegram.sendMessage(chatId,
`🔑 Copie o código Pix abaixo e pague no app do seu banco:

\`\`\`
${codigoPix}
\`\`\`

🕐 Você tem 10 minutos para pagar. O acesso será enviado automaticamente após confirmação.`,
      { parse_mode: 'Markdown' });

    usuarios.set(paymentId, chatId);
  } catch (err) {
    console.error('Erro ao gerar PIX:', err.response?.data || err.message);
    await bot.telegram.sendMessage(chatId,
      '❌ Erro ao gerar Pix. Tente novamente mais tarde.');
  }
}

app.post('/webhook', async (req, res) => {
  try {
    const paymentId = req.body?.data?.id;

    if (!paymentId) return res.sendStatus(200);

    const response = await axios.get(`https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.ACCESS_TOKEN_MP}`
        }
      });

    const status = response.data.status;
    const chatId = usuarios.get(paymentId);

    if (status === 'approved' && chatId) {
      await bot.telegram.sendMessage(chatId,
`✅ Pagamento confirmado!

🔓 Acesse agora o seu curso:
https://drive.google.com/drive/folders/1LYYBmQQS6gROjbi16v4YLPq6yTek6Le9?usp=sharing`);

      usuarios.delete(paymentId);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Erro no webhook:', err.message);
    res.sendStatus(500);
  }
});

app.listen(process.env.PORT || 4000, () => {
  console.log('Servidor rodando...');
});

bot.launch();
