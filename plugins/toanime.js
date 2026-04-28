'use strict';

const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const axios = require('axios');
const FormData = require('form-data');

module.exports = {
  commands: ['toanime', 'jadianime'],

  async execute(ctx) {
    const { sock, msg, remoteJid } = ctx;

    try {
      // 📌 detectar mensaje citado o actual
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

      // 🔥 SUBIR A TELEGRAPH
      const form = new FormData();
      form.append('file', buffer, 'image.jpg');

      const uploadRes = await axios.post(
        'https://telegra.ph/upload',
        form,
        { headers: form.getHeaders() }
      );

      const data = uploadRes.data;

      if (!data[0]?.src) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Error subiendo imagen'
        }, { quoted: msg });
      }

      const imageUrl = 'https://telegra.ph' + data[0].src;

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
        } catch (e) {
          console.log('❌ API falló:', api);
        }
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
