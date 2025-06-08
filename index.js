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
            title: 'Curso Clone com IA',
            quantity: 1,
            currency_id: 'BRL',
            unit_price: 47.0
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

    const msg = await ctx.replyWithMarkdown(
      `➡️ Escaneie o código ou pague via *Pix Copia e Cola*:

[🔳 QR CODE no link abaixo]

[🔗 PAGAR AGORA](${linkPagamento})

⏰ Você tem 10 minutos para efetuar o pagamento.`
    );

    usuarios.set(`msg_${ctx.from.id}`, msg.message_id);
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
      const pixMsgId = usuarios.get(`msg_${telegramId}`);

      if (chatId) {
        if (pixMsgId) {
          await bot.telegram.deleteMessage(chatId, pixMsgId);
        }

        await bot.telegram.sendMessage(chatId,
          `🔥 Pagamento recebido, liberação em andamento...

` +
          `⏰ Pode levar até *5 minutos* para confirmar a liberação. Aguarde!

` +
          `✅ *Curso liberado com sucesso!*

` +
          `📚 *Nome do Curso:* Clone com IA
` +
          `💰 *Valor pago:* R$47,00
` +
          `🔓 *Acesso:* Vitalício

` +
          `🚀 *Obrigado pela preferência!*`,
          { parse_mode: 'Markdown' }
        );

        await bot.telegram.sendMessage(chatId,
          `🔗 Aqui está seu link de acesso:
https://drive.google.com/drive/folders/1LK6fpV6EBucTNbGiTi0vJDZwqHlkkP9b?usp=drive_link`,
          { disable_web_page_preview: true }
        );

        usuarios.delete(telegramId);
        usuarios.delete(`msg_${telegramId}`);
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