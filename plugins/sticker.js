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

      const input = path.join(tempDir, 'input');
      const output = path.join(tempDir, 'output.webp');

      fs.writeFileSync(input, buffer);

      const isImage = type === 'imageMessage';

const vf = isImage
  ? 'scale=512:-1:flags=lanczos'
  : 'scale=512:-1:flags=lanczos,fps=18';

const command = ffmpeg(input);

if (!isImage) {
  command.setStartTime(0).setDuration(6);
}

command
  .outputOptions([
    '-vcodec libwebp',
    '-vf ' + vf,
    '-lossless 0',
    '-qscale 0',
    '-compression_level 6',
    '-loop 0',
    '-preset picture',
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
