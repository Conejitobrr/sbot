'use strict';

const fetch = require('node-fetch');

module.exports = {
  name: 'ai',
  description: 'IA natural tipo ChatGPT',
  command: ['ai', 'bot', 'ia'],

  async execute(sock, msg, args) {
    const text = args.join(' ');

    if (!text) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: '🤖 Escribe algo para responderte.\nEjemplo: !ai qué es el amor'
      });
    }

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer TU_API_KEY"
        },
        body: JSON.stringify({
          model: "llama3-70b-8192",
          messages: [
            {
              role: "system",
              content: "Eres un bot tipo Simsimi pero más natural, divertido y humano. Responde de forma corta, casual y conversacional."
            },
            {
              role: "user",
              content: text
            }
          ],
          temperature: 0.9
        })
      });

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content;

      return sock.sendMessage(msg.key.remoteJid, {
        text: reply || "No pude responder 😅"
      });

    } catch (err) {
      console.error(err);
      return sock.sendMessage(msg.key.remoteJid, {
        text: "⚠️ Error conectando con la IA"
      });
    }
  }
};
