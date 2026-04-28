'use strict';

const fetch = require('node-fetch');

module.exports = {
  commands: ['logocorazon', 'logochristmas'],

  async execute(ctx) {
    const { sock, remoteJid, msg, command, args } = ctx;

    const text = args.join(' ');
    if (!text) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Escribe un texto\nEjemplo:\n.logocorazon Sirius'
      }, { quoted: msg });
    }

    try {
      await sock.sendMessage(remoteJid, {
        text: '🎨 Creando diseño... espera un momento'
      }, { quoted: msg });

      let apiUrl = '';

      // 🔥 APIs alternativas (más estables)
      if (command === 'logocorazon') {
        apiUrl = `https://api.popcat.xyz/text2heart?text=${encodeURIComponent(text)}`;
      }

      if (command === 'logochristmas') {
        apiUrl = `https://api.popcat.xyz/christmas?text=${encodeURIComponent(text)}`;
      }

      // ⚠️ Si la API falla, fallback
      if (!apiUrl) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Error generando imagen'
        }, { quoted: msg });
      }

      await sock.sendMessage(remoteJid, {
        image: { url: apiUrl },
        caption: `✨ Logo generado:\n${text}`
      }, { quoted: msg });

    } catch (e) {
      console.log('Error logo:', e);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error al generar el logo, intenta nuevamente'
      }, { quoted: msg });
    }
  }
};
