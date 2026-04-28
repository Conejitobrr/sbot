'use strict';

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
.logocorazon Sirius
.logochristmas Sirius`
      }, { quoted: msg });
    }

    try {
      await sock.sendMessage(remoteJid, {
        text: '🎨 Generando diseño, espera un momento...'
      }, { quoted: msg });

      let imageUrl = '';

      if (command === 'logocorazon') {
        imageUrl =
`https://api.neoxr.eu/api/textpro/heart-flashlight?text=${encodeURIComponent(text)}&apikey=demo`;
      }

      if (command === 'logochristmas') {
        imageUrl =
`https://api.neoxr.eu/api/textpro/christmas?text=${encodeURIComponent(text)}&apikey=demo`;
      }

      await sock.sendMessage(remoteJid, {
        image: { url: imageUrl },
        caption:
`✨ Logo generado correctamente

📝 Texto: ${text}`
      }, { quoted: msg });

    } catch (e) {
      console.log('Error logo:', e.message);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error al generar el logo'
      }, { quoted: msg });
    }
  }
};
