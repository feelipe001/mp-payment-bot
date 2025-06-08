require('dotenv').config();
const { Telegraf } = require('telegraf');
const express = require('express');
const axios = require('axios');

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();
app.use(express.json());

const usuarios = new Map();

bot.start(async (ctx) => {
  try {
    await ctx.deleteMessage();

    usuarios.set(ctx.from.id, ctx.chat.id);

    const response = await axios.post(
      'https://api.mercadopago.com/checkout/preferences',
      {
        items: [
          {
            title: 'Acesso Premium',
            quantity: 1,
            currency_id: 'BRL',
            unit_price: 10.0
          }
        ],
        payment_methods: {
          excluded_payment_types: [{ id: 'credit_card' }, { id: 'ticket' }]
        },
        back_urls: {
          success: 'https://t.me/EliteCreatorBot',
          failure: 'https://t.me/EliteCreatorBot',
          pending: 'https://t.me/EliteCreatorBot'
        },
        auto_return: 'approved',
        metadata: {
          telegram_id: ctx.from.id
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.ACCESS_TOKEN_MP}`
        }
      }
    );

    const linkPagamento = response.data.init_point;

    await ctx.replyWithMarkdown(
      `🚀 Bem-vindo ao *Elite Creator Bot*!

Aqui você aprende a criar fotos impossíveis com IA com 1 clique.

📸 Curso disponível: *Clone com IA*
💰 Investimento: R$47 (acesso vitalício)

Clique abaixo para garantir seu acesso:

[🔗 PAGAR AGORA](${linkPagamento})`
    );
  } catch (error) {
    console.error('Erro ao criar cobrança Pix:', error.response?.data || error.message);
    await ctx.reply('❌ Erro ao gerar cobrança Pix. Tente novamente.');
  }
});

app.post('/webhook', async (req, res) => {
  const paymentId = req.body.data?.id;
  if (!paymentId) return res.sendStatus(400);

  try {
    const paymentInfo = await axios.get(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${process.env.ACCESS_TOKEN_MP}` }
    });

    const status = paymentInfo.data.status;
    const telegramId = paymentInfo.data.metadata?.telegram_id;

    if (status === 'approved' && telegramId) {
      const chatId = usuarios.get(parseInt(telegramId));
      if (chatId) {
       await bot.telegram.sendMessage(
  chatId,
  "✅ Pagamento confirmado!\n\n📁 Aqui está seu link de acesso:\nhttps://drive.google.com/drive/folders/1LK6fpV6EBucTNbGiTi0vJDZwqHlkkP9b?usp=drive_link"
);
        usuarios.delete(telegramId);
      }
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
