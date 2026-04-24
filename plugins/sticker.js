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
          text: '❌ Responde a una imagen o video con .s'
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

      // 🔥 EXTENSIÓN CORRECTA (CLAVE)
      const input = path.join(
        tempDir,
        `input.${type === 'imageMessage' ? 'jpg' : 'mp4'}`
      );

      const output = path.join(tempDir, 'output.webp');

      fs.writeFileSync(input, buffer);

      const isImage = type === 'imageMessage';

      // 🔥 ESCALA + PADDING TRANSPARENTE (NO DEFORMA)
      const vf = isImage
  ? 'scale=512:512:force_original_aspect_ratio=decrease:flags=lanczos,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000'
  : 'scale=512:512:force_original_aspect_ratio=decrease:flags=lanczos,fps=18,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000';      const command = ffmpeg(input);

      if (!isImage) {
        command.setStartTime(0).setDuration(6);
      }

      command
        .outputOptions([
  '-vcod.outputOptions([
  '-vcodec libwebp',
  '-vf ' + vf,
  '-pix_fmt yuva420p',

  // 🔥 CALIDAD ALTA REAL
  '-q:v 90',              // calidad (0–100)
  '-compression_level 4', // menos compresión = más calidad
  '-preset picture',

  '-loop 0',
  '-an',
  '-vsync 0'
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
          console.error('FFMPEG ERROR:', err);

          await sock.sendMessage(remoteJid, {
            text: '❌ Error al convertir a sticker'
          }, { quoted: msg });

          if (fs.existsSync(input)) fs.unlinkSync(input);
        });

    } catch (err) {
      console.error(err);
      await sock.sendMessage(remoteJid, {
        text: '❌ Error general en sticker'
      }, { quoted: msg });
    }
  }
};
