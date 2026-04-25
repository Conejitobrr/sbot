'use strict';

const fetch = require('node-fetch');

module.exports = {
  name: 'ai',
  description: 'IA natural tipo ChatGPT usando Groq',
  command: ['ai', 'bot', 'ia'],

  async execute(sock, msg, args) {
    const text = args.join(' ').trim();

    if (!text) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: '🤖 Escribe algo para responderte.\nEjemplo: !ai qué es el amor'
      });
    }

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama3-70b-8192',
          messages: [
            {
              role: 'system',
              content: 'Eres un asistente tipo Simsimi pero más natural, humano y conversacional. Responde corto, casual, con lenguaje sencillo y sin sonar robótico.'
            },
            {
              role: 'user',
              content: text
            }
          ],
          temperature: 0.9,
          max_tokens: 200
        })
      });

      const data = await response.json();

      const reply = data?.choices?.[0]?.message?.content;

      if (!reply) {
        return sock.sendMessage(msg.key.remoteJid, {
          text: '🤖 No pude generar respuesta 😅'
        });
      }

      return sock.sendMessage(msg.key.remoteJid, {
        text: `🤖 ${reply}`
      });

    } catch (err) {
      console.error('Error IA:', err);

      return sock.sendMessage(msg.key.remoteJid, {
        text: '⚠️ Error conectando con la IA'
      });
    }
  }
};
