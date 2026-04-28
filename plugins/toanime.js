'use strict';

const axios = require('axios');
const FormData = require('form-data');

module.exports = {
  commands: ['toanime', 'jadianime'],

  async execute(ctx) {
    const { sock, msg, remoteJid } = ctx;

    try {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const isQuotedImage = quoted?.imageMessage;
      const isImage = msg.message?.imageMessage;

      if (!isImage && !isQuotedImage) {
        return await sock.sendMessage(remoteJid, {
          text: '❌ Responde o envía una imagen'
        }, { quoted: msg });
      }

      await sock.sendMessage(remoteJid, {
        text: '🎨 Convirtiendo a anime...'
      }, { quoted: msg });

      // 📥 descargar imagen
      const buffer = await sock.downloadMediaMessage(msg);

      // 📤 subir a Catbox (MUCHO más estable)
      const form = new FormData();
      form.append('fileToUpload', buffer, 'image.jpg');
      form.append('reqtype', 'fileupload');

      const upload = await axios.post(
        'https://catbox.moe/user/api.php',
        form,
        { headers: form.getHeaders() }
      );

      const imageUrl = upload.data;

      // 🎌 API ANIME (estable)
      const api = `https://api.nekorinn.my.id/tools/toanime?url=${encodeURIComponent(imageUrl)}`;

      await sock.sendMessage(remoteJid, {
        image: { url: api },
        caption: '✨ Aquí tienes tu imagen estilo anime'
      }, { quoted: msg });

    } catch (err) {
      console.log('Error en toanime:', err);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error al convertir la imagen'
      }, { quoted: msg });
    }
  }
};
