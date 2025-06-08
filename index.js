require('dotenv').config();
const { Telegraf } = require('telegraf');
const express = require('express');
const axios = require('axios');

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();

bot.start(async (ctx) => {
  try {
    // Apaga a mensagem anterior do usuário
    await ctx.deleteMessage();

    // Cria o pagamento PIX via Mercado Pago
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
          excluded_payment_types: [{ id: 'credit_card' }, { id: 'ticket' }],
          default_payment_method_id: 'pix'
        },
        back_urls: {
          success: 'https://t.me/EliteCreatorBot',
          failure: 'https://t.me/EliteCreatorBot',
          pending: 'https://t.me/EliteCreatorBot'
        },
        auto_return: 'approved'
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.ACCESS_TOKEN_MP}`
        }
      }
    );

    const linkPagamento = response.data.init_point;

    await ctx.replyWithMarkdown(
      `✅ Clique no link abaixo para pagar via *PIX*:\n\n[🔗 PAGAR AGORA](${linkPagamento})`
    );
  } catch (error) {
    console.error('Erro ao criar cobrança Pix:', error.response?.data || error.message);
    await ctx.reply('❌ Erro ao gerar cobrança Pix. Tente novamente.');
  }
});

// Webhook do Mercado Pago
app.use(express.json());
app.post('/webhook', async (req, res) => {
  const payment = req.body.data?.id;

  if (payment) {
    try {
      const paymentInfo = await axios.get(`https://api.mercadopago.com/v1/payments/${payment}`, {
        headers: { Authorization: `Bearer ${process.env.ACCESS_TOKEN_MP}` }
      });

      if (paymentInfo.data.status === 'approved') {
        // Aqui você pode enviar a mensagem com o link do Google Drive
        // Ex: notificar o Telegram ou salvar no banco
        console.log('Pagamento aprovado');
      }
    } catch (err) {
      console.error('Erro no webhook:', err.message);
    }
  }

  res.sendStatus(200);
});

// Iniciar servidor Express
app.listen(process.env.PORT || 4000, () => {
  console.log('Servidor rodando...');
});

// Iniciar bot
bot.launch();
