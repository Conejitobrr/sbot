'use strict';

const { Maker } = require('imagemaker.js');

module.exports = {
  commands: ['logocorazon', 'logochristmas'],

  async execute(ctx) {
    const { sock, remoteJid, msg, args, command } = ctx;

    const text = args.join(' ');
    if (!text) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Ingresa un texto\nEjemplo: .logocorazon Sirius'
      }, { quoted: msg });
    }

    try {
      // ⏳ Mensaje de carga
      await sock.sendMessage(remoteJid, {
        text: '⏳ Creando diseño, espera...'
      }, { quoted: msg });

      let result;

      // ❤️ CORAZÓN
      if (command === 'logocorazon') {
        result = await new Maker().Ephoto360(
          'https://en.ephoto360.com/text-heart-flashlight-188.html',
          [text]
        );
      }

      // 🎄 NAVIDAD
      if (command === 'logochristmas') {
        result = await new Maker().Ephoto360(
          'https://en.ephoto360.com/christmas-effect-by-name-376.html',
          [text]
        );
      }

      if (!result || !result.imageUrl) {
        throw new Error('No se pudo generar la imagen');
      }

      // 📸 Enviar imagen
      await sock.sendMessage(remoteJid, {
        image: { url: result.imageUrl },
        caption: '✨ Aquí tienes tu diseño'
      }, { quoted: msg });

    } catch (err) {
      console.error('Error logo:', err);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error al generar la imagen, intenta nuevamente'
      }, { quoted: msg });
    }
  }
};
