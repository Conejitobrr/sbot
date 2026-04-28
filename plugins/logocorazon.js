'use strict';

const axios = require('axios');

module.exports = {
  commands: ['logocorazon', 'logochristmas'],

  async execute(ctx) {
    const { sock, remoteJid, msg, command, args } = ctx;

    const text = args.join(' ').trim();

    if (!text) {
      return sock.sendMessage(remoteJid, {
        text:
`❌ Debes escribir un texto

Ejemplo:
.logocorazon Sirius`
      }, { quoted: msg });
    }

    try {
      await sock.sendMessage(remoteJid, {
        text: '🎨 Generando logo...'
      }, { quoted: msg });

      let url = '';

      // 🔥 API QUE SÍ FUNCIONA
      if (command === 'logocorazon') {
        url = `https://api.erdwpe.com/api/maker/heart?text=${encodeURIComponent(text)}`;
      }

      if (command === 'logochristmas') {
        url = `https://api.erdwpe.com/api/maker/christmas?text=${encodeURIComponent(text)}`;
      }

      // 🔥 DESCARGAR COMO BUFFER (CLAVE)
      const res = await axios.get(url, {
        responseType: 'arraybuffer'
      });

      const buffer = Buffer.from(res.data);

      await sock.sendMessage(remoteJid, {
        image: buffer,
        caption: `✨ Logo generado:\n${text}`
      }, { quoted: msg });

    } catch (e) {
      console.log('Error logo:', e.message);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error al generar el logo (API caída o inválida)'
      }, { quoted: msg });
    }
  }
};
