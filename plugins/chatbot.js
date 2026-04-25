'use strict';

const axios = require('axios');

module.exports = {
  commands: ['bot', 'chat'],

  async execute({ sock, msg, remoteJid, args, pushName }) {

    const text = args.join(' ');

    if (!text) {
      return sock.sendMessage(remoteJid, {
        text: '💬 Escribe algo después del comando\n\nEjemplo:\n.bot hola'
      }, { quoted: msg });
    }

    try {
      // 🔥 API GRATIS (SimSimi pública)
      const res = await axios.get('https://api.simsimi.vn/v1/simtalk', {
        params: {
          text,
          lc: 'es'
        },
        timeout: 10000
      });

      let reply = res.data?.message;

      if (!reply) throw 'Sin respuesta';

      await sock.sendMessage(remoteJid, {
        text: `🤖 ${reply}`
      }, { quoted: msg });

    } catch (err) {

      // 🔥 FALLBACK INTELIGENTE
      const fallback = getFallback(text);

      await sock.sendMessage(remoteJid, {
        text: `🤖 ${fallback}`
      }, { quoted: msg });
    }
  }
};

// 🔥 RESPUESTAS LOCALES (por si falla la API)
function getFallback(text) {
  text = text.toLowerCase();

  if (text.includes('hola')) return 'Hola 😄 ¿Cómo estás?';
  if (text.includes('como estas')) return 'Estoy bien, gracias por preguntar 🤖';
  if (text.includes('tu nombre')) return 'Soy un bot 😎';
  if (text.includes('amor')) return 'El amor es complicado 💔 pero bonito';
  if (text.includes('adios')) return 'Adiós 👋 vuelve pronto';

  return 'No entendí 😅 intenta decirlo de otra forma';
}
