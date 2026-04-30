'use strict';

function getTextFromMsg(msg) {
  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    ''
  );
}

function cleanCommand(text = '') {
  return text.replace(/^[.!/#]?(ai|bot|ia)\s*/i, '').trim();
}

function localReply(text = '') {
  const t = text.toLowerCase();

  if (/(hola|buenas|hey|ola)/i.test(t)) {
    return 'Holaa 😄 ¿qué haces?';
  }

  if (/(como estas|cómo estás)/i.test(t)) {
    return 'Estoy bien 😄 aquí hablando contigo.';
  }

  if (/(quien eres|quién eres)/i.test(t)) {
    return 'Soy SiriusBot 🤖, tu bot de WhatsApp.';
  }

  if (/(gracias|thanks)/i.test(t)) {
    return 'De nada 😄';
  }

  return 'Mmm interesante 🤔 cuéntame más.';
}

async function askGroq(text) {
  if (!process.env.GROQ_API_KEY) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content:
              'Eres SiriusBot, un asistente de WhatsApp. Responde en español, natural, corto, divertido y útil. No hagas respuestas largas salvo que te lo pidan.'
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.8,
        max_tokens: 250
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.log('❌ GROQ ERROR:', data);
      return null;
    }

    return data?.choices?.[0]?.message?.content?.trim() || null;

  } catch (err) {
    console.log('❌ IA ERROR:', err?.message || err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  commands: ['ai', 'bot', 'ia'],

  async execute(ctx) {
    const { sock, msg, remoteJid, args } = ctx;

    let text = args?.join(' ')?.trim();

    if (!text) {
      text = cleanCommand(getTextFromMsg(msg));
    }

    if (!text) {
      return sock.sendMessage(remoteJid, {
        text: '🤖 Escribe algo para hablar conmigo.\n\nEjemplo:\n.ai hola cómo estás'
      }, { quoted: msg });
    }

    try {
      await sock.sendPresenceUpdate('composing', remoteJid);

      const aiReply = await askGroq(text);
      const reply = aiReply || localReply(text);

      return sock.sendMessage(remoteJid, {
        text: reply
      }, { quoted: msg });

    } catch {
      return sock.sendMessage(remoteJid, {
        text: localReply(text)
      }, { quoted: msg });
    }
  }
};
