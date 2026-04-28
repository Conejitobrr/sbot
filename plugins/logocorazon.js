'use strict';

const { Maker } = require('imagemaker.js');

module.exports = {
  commands: ['logocorazon', 'logochristmas'],

  async execute(ctx) {
    const { sock, remoteJid, msg, args, command } = ctx;

    const text = args.join(' ');
    if (!text) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Ingresa un texto\n\nEjemplo:\n.logocorazon Sirius'
      }, { quoted: msg });
    }

    const response = text.split('|');

    try {
      // 🔥 MENSAJE DE ESPERA
      await sock.sendMessage(remoteJid, {
        text: '⏳ Elaborando diseño, espera un momento...'
      }, { quoted: msg });

      let result;

      // ❤️ LOGO CORAZÓN
      if (command === 'logocorazon') {
        result = await new Maker().Ephoto360(
          'https://en.ephoto360.com/text-heart-flashlight-188.html',
          [response[0]]
        );
      }

      // 🎄 LOGO NAVIDAD
      if (command === 'logochristmas') {
        result = await new Maker().Ephoto360(
          'https://en.ephoto360.com/christmas-effect-by-name-376.html',
          [response[0]]
        );
      }

      // 🔥 ENVIAR IMAGEN
      await sock.sendMessage(remoteJid, {
        image: { url: result.imageUrl }
      }, { quoted: msg });

    } catch (e) {
      console.log('❌ Error logo:', e.message);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error al generar el logo, intenta nuevamente'
      }, { quoted: msg });
    }
  }
};
