'use strict';

module.exports = {
  name: 'ai',
  command: ['ai', 'bot', 'ia'],

  async execute(sock, msg, args) {
    const text = args.join(' ').trim();

    console.log('🧠 AI INPUT:', text);

    if (!text) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: 'Escribe algo 😄'
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
              content: 'Eres un bot natural tipo WhatsApp.'
            },
            {
              role: 'user',
              content: text
            }
          ]
        })
      });

      const data = await response.json();

      console.log('🧠 GROQ FULL RESPONSE:', JSON.stringify(data, null, 2));

      const reply = data?.choices?.[0]?.message?.content;

      if (!reply) {
        return sock.sendMessage(msg.key.remoteJid, {
          text: '⚠️ No llegó respuesta de la IA'
        });
      }

      await sock.sendMessage(msg.key.remoteJid, {
        text: reply
      });

    } catch (err) {
      console.error('❌ ERROR IA:', err);

      return sock.sendMessage(msg.key.remoteJid, {
        text: '⚠️ Error conectando con IA'
      });
    }
  }
};
