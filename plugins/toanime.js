'use strict';

const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const FormData = require('form-data');
const fetch = require('node-fetch');

module.exports = {
  commands: ['toanime', 'jadianime'],

  async execute(ctx) {
    const { sock, msg, remoteJid } = ctx;

    try {
      const quoted = msg.message?.extendedTextMessage?.contextInfo;
      const message = quoted?.quotedMessage || msg.message;

      if (!message) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Responde a una imagen'
        }, { quoted: msg });
      }

      const type = Object.keys(message)[0];

      if (type !== 'imageMessage') {
        return sock.sendMessage(remoteJid, {
          text: '❌ Solo funciona con imágenes'
        }, { quoted: msg });
      }

      const media = message[type];

      // 📥 descargar imagen
      const stream = await downloadContentFromMessage(media, 'image');
      let buffer = Buffer.from([]);

      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      if (!buffer.length) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Error descargando imagen'
        }, { quoted: msg });
      }

      await sock.sendMessage(remoteJid, {
        text: '🎨 Convirtiendo a anime...'
      }, { quoted: msg });

      // 🔥 SUBIR A TELEGRAPH (MUCHO MÁS ESTABLE)
      const form = new FormData();
      form.append('file', buffer, 'image.jpg');

      const res = await fetch('https://telegra.ph/upload', {
        method: 'POST',
        body: form
      });

      const json = await res.json();

      if (!json[0]?.src) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Error subiendo imagen'
        }, { quoted: msg });
      }

      const imageUrl = 'https://telegra.ph' + json[0].src;

      // 🔥 APIs (fallback)
      const apis = [
        `https://api.lolhuman.xyz/api/imagetoanime?apikey=demo&img=${imageUrl}`,
        `https://api.zahwazein.xyz/photoeditor/jadianime?url=${imageUrl}&apikey=demo`,
        `https://api.caliph.biz.id/api/animeai?img=${imageUrl}&apikey=caliphkey`
      ];

      let sent = false;

      for (const api of apis) {
        try {
          await sock.sendMessage(remoteJid, {
            image: { url: api },
            caption: '✨ Resultado anime'
          }, { quoted: msg });

          sent = true;
          break;
        } catch {}
      }

      if (!sent) {
        await sock.sendMessage(remoteJid, {
          text: '❌ Todas las APIs fallaron'
        }, { quoted: msg });
      }

    } catch (err) {
      console.log('❌ Error en toanime:', err);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error general'
      }, { quoted: msg });
    }
  }
};
