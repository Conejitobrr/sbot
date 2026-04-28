'use strict';

const axios = require('axios');
const FormData = require('form-data');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
  commands: ['toanime', 'jadianime'],

  async execute(ctx) {
    const { sock, msg, remoteJid } = ctx;

    try {
      const m = msg.message || {};

      // 🔥 detectar imagen (directa o reply)
      let imageMessage =
        m.imageMessage ||
        m.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;

      if (!imageMessage) {
        return await sock.sendMessage(remoteJid, {
          text: '❌ Responde o envía una imagen'
        }, { quoted: msg });
      }

      await sock.sendMessage(remoteJid, {
        text: '🎨 Convirtiendo a anime...'
      }, { quoted: msg });

      // 📥 descargar imagen correctamente
      const stream = await downloadContentFromMessage(imageMessage, 'image');

      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      // 📤 subir a Catbox
      const form = new FormData();
      form.append('fileToUpload', buffer, 'image.jpg');
      form.append('reqtype', 'fileupload');

      const upload = await axios.post(
        'https://catbox.moe/user/api.php',
        form,
        { headers: form.getHeaders() }
      );

      const imageUrl = upload.data;

      // 🎌 API anime
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
