require('dotenv').config()
const express = require('express')
const axios = require('axios')
const { Telegraf } = require('telegraf')
const { v4: uuidv4 } = require('uuid')

const app = express()
app.use(express.json())

const bot = new Telegraf(process.env.BOT_TOKEN)
const usuarios = new Map()

bot.start(async (ctx) => {
  const chatId = ctx.chat.id
  usuarios.set(chatId, chatId)

  await ctx.replyWithMarkdown(`
🚀 *Bem-vindo ao Elite Creator Bot!*

Aqui você aprende a criar fotos impossíveis com IA com 1 clique.

📸 *Curso disponível:* Clone com IA  
💰 *Investimento:* R$47,00 (acesso vitalício)

🔒 Gerando chave Pix segura...
`)

  try {
    const response = await axios.post(
      'https://api.mercadopago.com/v1/payments',
      {
        transaction_amount: 47,
        payment_method_id: "pix",
        description: "Acesso vitalício - Curso IA",
        payer: { email: "comprador@email.com" }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.ACCESS_TOKEN_MP}`,
          'X-Idempotency-Key': uuidv4()
        }
      }
    )

    const { id, point_of_interaction } = response.data
    const codigoPix = point_of_interaction.transaction_data.qr_code

    await ctx.replyWithMarkdown(`
📎 *Copie o código Pix abaixo e cole no app do seu banco:*

\`\`\`
${codigoPix}
\`\`\`

🕐 Você tem 10 minutos para efetuar o pagamento do Pix.
`)

    usuarios.set(String(id), chatId)
  } catch (err) {
    console.log("Erro Pix:", err.response?.data || err.message)
    ctx.reply("❌ Erro ao gerar Pix. Tente novamente mais tarde.")
  }
})

app.post("/webhook", async (req, res) => {
  const data = req.body

  if (data.type === "payment" && data.data?.id) {
    try {
      const payment = await axios.get(
        `https://api.mercadopago.com/v1/payments/${data.data.id}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.ACCESS_TOKEN_MP}`
          }
        }
      )

      const status = payment.data.status
      const id = String(payment.data.id)
      const chatId = usuarios.get(id)

      if (status === "approved" && chatId) {
        await bot.telegram.sendMessage(chatId, `✅ *Pagamento aprovado!*
🔓 Acesse seu curso vitalício agora:
https://drive.google.com/drive/folders/1LK6fpV6EBucTNbGiTi0vJDZwqHlkkP9b?usp=drive_link`, {
          parse_mode: "Markdown"
        })

        usuarios.delete(id)
      }
    } catch (err) {
      console.log("Erro no webhook:", err.message)
    }
  }

  res.sendStatus(200)
})

app.listen(process.env.PORT || 4000, () => {
  console.log("Servidor rodando...")
})

bot.launch()
