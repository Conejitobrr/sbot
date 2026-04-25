'use strict';

const axios = require('axios');

module.exports = {
  commands: ['chat', 'ia'],

  async execute({ sock, msg, remoteJid, args, pushName }) {

    const text = args.join(' ');

    if (!text) {
      return sock.sendMessage(remoteJid, {
        text: '💬 Escribe algo\nEjemplo: .chat Hola'
      }, { quoted: msg });
    }

    try {

      await sock.sendMessage(remoteJid, {
        text: '🤖 Pensando...'
      }, { quoted: msg });

      // 🔥 API GRATUITA (no key)
      const res = await axios.get(
        `https://api.simsimi.vn/v2/simtalk`,
        {
          params: {
            text,
            lc: 'es'
          }
        }
      );

      let reply = res.data?.message || 'No tengo respuesta 😅';

      await sock.sendMessage(remoteJid, {
        text: `🤖 ${reply}`
      }, { quoted: msg });

    } catch (e) {
      console.log('IA ERROR:', e.message);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error con la IA'
      }, { quoted: msg });
    }
  }
};
