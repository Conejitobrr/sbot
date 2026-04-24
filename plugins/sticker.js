'use strict';

const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
  commands: ['s'],

  async execute(ctx) {
    const { sock, msg, remoteJid } = ctx;

    try {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const message = quoted || msg.message;

      const type = Object.keys(message || {})[0];

      if (!type || (type !== 'imageMessage' && type !== 'videoMessage')) {
        return sock.sendMessage(remoteJid, {
          text: 'Responde a imagen, video o gif con .s'
        }, { quoted: msg });
      }

      const media = message[type];

      const stream = await downloadContentFromMessage(
        media,
        type === 'imageMessage' ? 'image' : 'video'
      );

      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      const isImage = type === 'imageMessage';

      const input = path.join(
        tempDir,
        `input.${isImage ? 'jpg' : 'mp4'}`
      );

      const output = path.join(tempDir, 'output.webp');

      fs.writeFileSync(input, buffer);

      // 🔥 FILTRO UNIVERSAL (NO DEFORMA + TRANSPARENCIA)
      const vf = isImage
        ? 'scale=512:512:force_original_aspect_ratio=decrease:flags=lanczos,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000'
        : 'scale=512:512:force_original_aspect_ratio=decrease:flags=lanczos,fps=10,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000';

      const command = ffmpeg(input);

      // 🔥 MUY IMPORTANTE PARA GIF/VIDEO
      if (!isImage) {
        command
          .inputOptions(['-ignore_loop 0']) // permite gifs
          .setStartTime(0)
          .setDuration(4); // máximo seguro
      }

      command
        .outputOptions([
          '-vcodec libwebp',
          '-vf ' + vf,
          '-pix_fmt yuva420p',

          // 🔥 ESTO ARREGLA EL "REINTENTAR"
          '-fs 700k',
          '-q:v 55',
          '-compression_level 6',

          '-loop 0',
          '-an',
          '-vsync 0'
        ])
        .toFormat('webp')
        .save(output)
        .on('end', async () => {
          try {
            const sticker = fs.readFileSync(output);

            await sock.sendMessage(remoteJid, {
              sticker
            }, { quoted: msg });

          } catch (e) {
            console.log('SEND ERROR:', e);
          }

          fs.unlinkSync(input);
          fs.unlinkSync(output);
        })
        .on('error', async (err) => {
          console.log('FFMPEG ERROR:', err);

          await sock.sendMessage(remoteJid, {
            text: 'Error al convertir (video/gif)'
          }, { quoted: msg });

          if (fs.existsSync(input)) fs.unlinkSync(input);
        });

    } catch (err) {
      console.log('GENERAL ERROR:', err);

      await sock.sendMessage(remoteJid, {
        text: 'Error general en sticker'
      }, { quoted: msg });
    }
  }
};
