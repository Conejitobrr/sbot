'use strict';

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
  commands: ['tovideo', 'tomp4'],

  async execute(ctx) {
    const { sock, msg, remoteJid } = ctx;

    try {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

      if (!quoted) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Responde a un sticker con .tovideo'
        }, { quoted: msg });
      }

      const type = Object.keys(quoted)[0];

      if (type !== 'stickerMessage') {
        return sock.sendMessage(remoteJid, {
          text: '❌ Solo funciona con stickers'
        }, { quoted: msg });
      }

      const media = quoted.stickerMessage;

      const stream = await downloadContentFromMessage(media, 'sticker');

      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      const input = path.join(tempDir, 'input.webp');
      const output = path.join(tempDir, 'output.mp4');

      fs.writeFileSync(input, buffer);

      const isAnimated = media.isAnimated;

      // 🔥 COMANDO FFmpeg
      const cmd = isAnimated
        ? `ffmpeg -y -i "${input}" -movflags faststart -pix_fmt yuv420p -vf "scale=512:-1:flags=lanczos,fps=15" "${output}"`
        : `ffmpeg -y -loop 1 -i "${input}" -t 3 -movflags faststart -pix_fmt yuv420p -vf "scale=512:-1:flags=lanczos" "${output}"`;

      exec(cmd, async (err) => {
        if (err) {
          console.log('FFMPEG ERROR:', err);

          return sock.sendMessage(remoteJid, {
            text: '❌ Error al convertir a video'
          }, { quoted: msg });
        }

        try {
          const video = fs.readFileSync(output);

          await sock.sendMessage(remoteJid, {
            video,
            mimetype: 'video/mp4',
            caption: '🎞 Convertido a video'
          }, { quoted: msg });

        } catch (e) {
          console.log('SEND ERROR:', e);
        }

        fs.unlinkSync(input);
        fs.unlinkSync(output);
      });

    } catch (err) {
      console.log('ERROR GENERAL:', err);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error general en tovideo'
      }, { quoted: msg });
    }
  }
};
