require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const axios = require('axios');
const fs = require('fs');

const app = express();
app.use(express.json());

const bot = new Telegraf(process.env.BOT_TOKEN);
const usuarios = new Map();

bot.start(async (ctx) => {
  const chatId = ctx.chat.id;
  usuarios.set(chatId, chatId);

  await ctx.replyWithPhoto(
    { source: './imagem-ia.jpg' },
    {
      caption:
        'Olha essa imagem aqui 👇\nParece capa de revista, né?',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('👉 Eu quero fazer uma assim', 'quero_fazer')]
      ])
    }
  );
});

bot.action('quero_fazer', async (ctx) => {
  await ctx.reply(
    'Isso foi feito com Inteligência Artificial.\nE qualquer pessoa consegue criar isso com o celular.',
    Markup.inlineKeyboard([
      [Markup.button.callback('👉 Me ensina agora', 'me_ensina')]
    ])
  );
});

bot.action('me_ensina', async (ctx) => {
  await ctx.reply(
    'Eu montei um curso direto ao ponto:\nAprenda a criar imagens incríveis com IA, do zero, sem precisar saber nada de design.',
    Markup.inlineKeyboard([
      [Markup.button.callback('👉 Ver como funciona', 'ver_como_funciona')]
    ])
  );
});

bot.action('ver_como_funciona', async (ctx) => {
  await ctx.reply(
    '📲 Acesso imediato\n💡 Passo a passo fácil\n🔥 Resultado profissional\n\nCurso completo por apenas R$47,00.',
    Markup.inlineKeyboard([
      [Markup.button.callback('💳 Pagar com Pix', 'pagar_pix')]
    ])
  );
});

bot.action('pagar_pix', async (ctx) => {
  const chatId = ctx.chat.id;

  try {
    const res = await axios.post(
      'https://api.mercadopago.com/v1/payments',
      {
        transaction_amount: 47,
        payment_method_id: 'pix',
        description: 'Curso IA - Acesso Vitalício',
        payer: {
          email: `${chatId}@emailfake.com`
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.ACCESS_TOKEN_MP}`
        }
      }
    );

    const pix = res.data.point_of_interaction.transaction_data;

    await ctx.replyWithMarkdown(`📲 Copie o código Pix abaixo e pague no seu banco:

\`\`\`
${pix.transaction_id}
\`\`\`

⏳ Você tem 10 minutos para pagar.
Assim que o pagamento for confirmado, você receberá o link do curso automaticamente.`);

    usuarios.set(chatId, chatId);
  } catch (err) {
    console.error('Erro ao gerar Pix:', err.message);
    await ctx.reply('❌ Erro ao gerar Pix. Tente novamente mais tarde.');
  }
});

app.post('/webhook', async (req, res) => {
  const paymentInfo = req.body.data;

  try {
    const response = await axios.get(`https://api.mercadopago.com/v1/payments/${paymentInfo.id}`, {
      headers: {
        Authorization: `Bearer ${process.env.ACCESS_TOKEN_MP}`
      }
    });

    const status = response.data.status;
    const chatIdFake = response.data.payer.email;
    const chatId = parseInt(chatIdFake.split('@')[0]);

    if (status === 'approved') {
      await bot.telegram.sendMessage(
        chatId,
        `✅ Pagamento confirmado!\n\n📥 Aqui está o link do seu curso:\nhttps://drive.google.com/drive/folders/1LYYBmQQS6gROjbi16v4YLPq6yTek6Le9?usp=sharing`
      );

      usuarios.delete(chatId);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Erro no webhook:', err.message);
    res.sendStatus(500);
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Servidor rodando...');
});

bot.launch();
