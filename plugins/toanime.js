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

      // 🔥 descargar imagen correctamente
      const stream = await downloadContentFromMessage(
        message.message.imageMessage,
        'image'
      );

      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      // 🔥 subir a Catbox (estable)
      const form = new FormData();
      form.append('fileToUpload', buffer, 'image.jpg');
      form.append('reqtype', 'fileupload');

      const upload = await axios.post(
        'https://catbox.moe/user/api.php',
        form,
        { headers: form.getHeaders() }
      );

      const imageUrl = upload.data;

      // 🔥 API QUE SÍ FUNCIONA (devuelve imagen directa)
      const api = `https://api.popcat.xyz/waifu?image=${encodeURIComponent(imageUrl)}`;

      // 🔥 descargar resultado como BUFFER (NO URL)
      const res = await axios.get(api, { responseType: 'arraybuffer' });

      const animeBuffer = Buffer.from(res.data);

      // 🔥 enviar imagen REAL (no link)
      await sock.sendMessage(remoteJid, {
        image: animeBuffer,
        caption: '✨ Imagen estilo anime'
      }, { quoted: msg });

    } catch (e) {
      console.log('Error en toanime:', e);

      await sock.sendMessage(remoteJid, {
        text: '❌ No se pudo convertir la imagen (API caída o inválida).'
      }, { quoted: msg });
    }
  }
};
