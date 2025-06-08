require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { Telegraf } = require('telegraf');
const app = express();
app.use(express.json());

const bot = new Telegraf(process.env.BOT_TOKEN);
const MP_TOKEN = process.env.ACCESS_TOKEN_MP;

// Gera link de pagamento com metadata telegram_id
app.post('/create-payment', async (req, res) => {
  const { telegram_id } = req.body;
  try {
    const resp = await axios.post('https://api.mercadopago.com/checkout/preferences', {
      items: [{ title: 'Curso Clone com IA', quantity: 1, currency_id: 'BRL', unit_price: 47 }],
      metadata: { telegram_id },
      back_urls: { success: '', failure: '', pending: '' },
      auto_return: 'approved'
    }, { headers: { Authorization: `Bearer ${MP_TOKEN}` }});
    res.json({ init_point: resp.data.init_point });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
        await bot.telegram.sendMessage(tel,
          `✅ Pagamento confirmado!\n🎓 Aqui está seu acesso ao *Clone com IA*:\n📂 https://drive.google.com/SEULINK`);
      }
    } catch (e) {
      console.error(e);
    }
  }
  res.sendStatus(200);
});

bot.launch();
app.listen(process.env.PORT || 4000, () =>
  console.log('mp-payment-bot online')
);
