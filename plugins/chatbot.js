'use strict';

module.exports = {
  commands: ['ai', 'bot', 'ia'],

  async execute(ctx) {
    const { sock, msg, remoteJid } = ctx;

    // 📩 extraer texto correctamente
    const fullText =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      msg.message?.videoMessage?.caption ||
      '';

    // separar comando del texto
    const args = fullText.split(' ');
    args.shift(); // elimina ".ai", ".bot", etc.
    const text = args.join(' ').trim();

    if (!text) {
      return sock.sendMessage(remoteJid, {
        text: '🤖 Escribe algo para hablar conmigo.\nEjemplo: .ai hola cómo estás'
      }, { quoted: msg });
    }

    try {
      // 🚀 petición a Groq (USA FETCH GLOBAL, NO node-fetch)
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'system',
              content: 'Eres un asistente tipo WhatsApp. Respondes natural, corto, humano y conversacional como Simsimi pero inteligente.'
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

      console.log('📦 GROQ RESPONSE:', JSON.stringify(data, null, 2));

      const reply = data?.choices?.[0]?.message?.content;

      if (!reply) {
        return sock.sendMessage(remoteJid, {
          text: '⚠️ No recibí respuesta de la IA'
        }, { quoted: msg });
      }

      return sock.sendMessage(remoteJid, {
        text: reply
      }, { quoted: msg });

    } catch (err) {
      console.error('❌ IA ERROR:', err);

      return sock.sendMessage(remoteJid, {
        text: '⚠️ Error conectando con la IA'
      }, { quoted: msg });
    }
  }
};
