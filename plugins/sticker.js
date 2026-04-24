'use strict';

const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

module.exports = {
  commands: ['s'],

  async execute(ctx) {
    const { sock, msg, remoteJid } = ctx;

    try {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const message = quoted || msg.message;

      const type = Object.keys(message)[0];

      if (type !== 'imageMessage' && type !== 'videoMessage') {
        return sock.sendMessage(remoteJid, {
          text: '❌ Responde a una imagen o video con .s'
        }, { quoted: msg });
      }

      // 📥 Descargar media
      const stream = await sock.downloadMediaMessage({
        message: message
      });

      let buffer = Buffer.from([]);

      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      const tempDir = path.join(__dirname, '../temp');

      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }

      const input = path.join(tempDir, 'input');
      const output = path.join(tempDir, 'output.webp');

      fs.writeFileSync(input, buffer);

      ffmpeg(input)
        .outputOptions([
          '-vcodec', 'libwebp',
          '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,fps=15',
          '-lossless', '1',
          '-loop', '0',
          '-preset', 'default',
          '-an',
          '-vsync', '0'
        ])
        .toFormat('webp')
        .save(output)
        .on('end', async () => {

          const sticker = fs.readFileSync(output);

          await sock.sendMessage(remoteJid, {
            sticker
          }, { quoted: msg });

          fs.unlinkSync(input);
          fs.unlinkSync(output);
        })
        .on('error', async (err) => {
          console.log(err);

          await sock.sendMessage(remoteJid, {
            text: '❌ Error al crear sticker'
          }, { quoted: msg });
        });

    } catch (e) {
      console.log(e);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error inesperado'
      }, { quoted: msg });
    }
  }
};
