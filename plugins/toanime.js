'use strict';

const axios = require('axios');
const FormData = require('form-data');

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

      // 🔥 descargar imagen correctamente (BAILEYS)
      const stream = await require('@whiskeysockets/baileys').downloadContentFromMessage(
        message.message.imageMessage,
        'image'
      );

      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      // 🔥 subir a Catbox (ESTABLE)
      const form = new FormData();
      form.append('fileToUpload', buffer, 'image.jpg');
      form.append('reqtype', 'fileupload');

      const upload = await axios.post('https://catbox.moe/user/api.php', form, {
        headers: form.getHeaders()
      });

      const imageUrl = upload.data;

      // 🔥 API PRINCIPAL
      let api = `https://api.itsrose.life/image/anime?url=${encodeURIComponent(imageUrl)}`;

      try {
        await sock.sendMessage(remoteJid, {
          image: { url: api },
          caption: '✨ Aquí tienes tu imagen estilo anime'
        }, { quoted: msg });

      } catch (err) {

        // 🔥 FALLBACK AUTOMÁTICO
        const backup = `https://api.popcat.xyz/waifu?image=${encodeURIComponent(imageUrl)}`;

        await sock.sendMessage(remoteJid, {
          image: { url: backup },
          caption: '✨ (Modo respaldo) Imagen estilo anime'
        }, { quoted: msg });
      }

    } catch (e) {
      console.log('Error en toanime:', e);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error al convertir la imagen a anime.'
      }, { quoted: msg });
    }
  }
};
