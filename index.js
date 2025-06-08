require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { Telegraf } = require('telegraf');

const app = express();
app.use(express.json());

const bot = new Telegraf(process.env.BOT_TOKEN);
const usuarios = new Map();

bot.start(async (ctx) => {
  const chatId = ctx.chat.id;
  usuarios.set(chatId, chatId);

  try {
    await ctx.replyWithMarkdown(
      `✨ *Bem-vindo ao Elite Creator Bot*!\n\nAqui você aprende a criar fotos impossíveis com IA – direto no seu celular, com 1 clique.\n\n\ud83d\udcf8 Curso disponível: *Clone com IA*\n\ud83d\udcb0 Investimento: R$47 (acesso vitalício)\n\nGerando chave Pix segura...`
    );

    const body = {
      transaction_amount: 47,
      description: 'Acesso curso Clone com IA',
      payment_method_id: 'pix',
      payer: {
        email: 'comprador@comprador.com',
        first_name: 'Elite',
        last_name: 'Creator',
        identification: {
          type: 'CPF',
          number: '12345678909',
        },
        address: {
          zip_code: '06233200',
          street_name: 'Av. das Nações Unidas',
          street_number: '3003',
          neighborhood: 'Bonfim',
          city: 'São Paulo',
          federal_unit: 'SP',
        },
      },
    };

    const idempotencyKey = `${chatId}-${Date.now()}`;

    const { data } = await axios.post(
      'https://api.mercadopago.com/v1/payments',
      body,
      {
        headers: {
          Authorization: `Bearer ${process.env.ACCESS_TOKEN_MP}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
        },
      }
    );

    const chave = data.point_of_interaction.transaction_data.qr_code;
    const idPagamento = data.id;

    usuarios.set(idPagamento, chatId);

    await ctx.replyWithMarkdown(
      `🔹 *Copie o código Pix abaixo e cole no app do seu banco:*\n\n\`\`\`${chave}\`\`\`\n\n⏰ *Você tem 10 minutos para efetuar o pagamento do Pix.*`
    );
  } catch (err) {
    console.error('Erro ao gerar Pix:', err?.response?.data || err);
    await ctx.reply('❌ Erro ao gerar Pix. Tente novamente mais tarde.');
  }
});

app.post('/webhook', async (req, res) => {
  try {
    const payment = req.body?.data?.id;
    if (!payment) return res.sendStatus(200);

    const { data: info } = await axios.get(
      `https://api.mercadopago.com/v1/payments/${payment}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.ACCESS_TOKEN_MP}`,
        },
      }
    );

    const status = info.status;
    const chatId = usuarios.get(payment);

    if (status === 'approved' && chatId) {
      await bot.telegram.sendMessage(
        chatId,
        `\ud83d\ude80 Pagamento confirmado com sucesso!\n\n✨ Aqui está seu link de acesso:\nhttps://drive.google.com/drive/folders/1LK6fpV6EBlucTNDGiTi0vJDZwqHlkkP9b?usp=drive_link`
      );
      usuarios.delete(payment);
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
