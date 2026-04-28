'use strict';

const axios = require('axios');
const FormData = require('form-data');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
  commands: ['toanime', 'jadianime'],

  async execute(ctx) {
    const { sock, msg, remoteJid } = ctx;

    try {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const message = quoted ? { message: quoted } : msg;

      const mime =
        message.message?.imageMessage?.mimetype ||
        msg.message?.imageMessage?.mimetype;

      if (!mime || !/image/.test(mime)) {
        return await sock.sendMessage(remoteJid, {
          text: '⚠️ Responde a una imagen o envía una imagen con el comando.'
        }, { quoted: msg });
      }

      // 🔥 descargar imagen
      const stream = await downloadContentFromMessage(
        message.message.imageMessage,
        'image'
      );

      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      // 🔥 subir a Catbox
      const form = new FormData();
      form.append('fileToUpload', buffer, 'image.jpg');
      form.append('reqtype', 'fileupload');

      const upload = await axios.post(
        'https://catbox.moe/user/api.php',
        form,
        { headers: form.getHeaders() }
      );

      const imageUrl = upload.data;

      // 🔥 APIs (ordenadas por estabilidad)
      const apis = [
        `https://api.popcat.xyz/waifu?image=${encodeURIComponent(imageUrl)}`,
        `https://api.itsrose.life/image/anime?url=${encodeURIComponent(imageUrl)}`
      ];

      let success = false;

      for (const api of apis) {
        try {
          await sock.sendMessage(remoteJid, {
            image: { url: api },
            caption: '✨ Imagen estilo anime'
          }, { quoted: msg });

          success = true;
          break;

        } catch (err) {
          console.log('API falló:', api);
        }
      }

      // 🔥 SI TODAS FALLAN → ENVÍA ORIGINAL
      if (!success) {
        await sock.sendMessage(remoteJid, {
          image: buffer,
          caption: '⚠️ No se pudo convertir, pero aquí está tu imagen original.'
        }, { quoted: msg });
      }

    } catch (e) {
      console.log('Error en toanime:', e);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error al procesar la imagen.'
      }, { quoted: msg });
    }
  }
};
