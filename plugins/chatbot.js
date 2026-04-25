'use strict';

module.exports = {
  commands: ['ai', 'bot', 'ia'],

  async execute(ctx) {
    const { sock, msg, remoteJid } = ctx;

    const text =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      '';

    const args = text.split(' ').slice(1).join(' ').trim();

    if (!args) {
      return sock.sendMessage(remoteJid, {
        text: '🤖 Escribe algo:\nEjemplo: .ai hola'
      }, { quoted: msg });
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
              content: 'Eres un bot tipo WhatsApp natural, corto, casual y humano.'
            },
            {
              role: 'user',
              content: args
            }
          ],
          temperature: 0.9
        })
      });

      const data = await response.json();

      const reply = data?.choices?.[0]?.message?.content;

      if (!reply) {
        return sock.sendMessage(remoteJid, {
          text: '⚠️ No hubo respuesta de la IA'
        }, { quoted: msg });
      }

      await sock.sendMessage(remoteJid, {
        text: reply
      }, { quoted: msg });

    } catch (err) {
      console.error('❌ IA ERROR:', err);

      await sock.sendMessage(remoteJid, {
        text: '⚠️ Error conectando con la IA'
      }, { quoted: msg });
    }
  }
};
