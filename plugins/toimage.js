'use strict';

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
  commands: ['toimage', 'img'],

  async execute(ctx) {
    const { sock, msg, remoteJid } = ctx;

    try {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

      if (!quoted) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Responde a un sticker con .toimage'
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
      fs.writeFileSync(input, buffer);

      const isAnimated = media.isAnimated;

      if (isAnimated) {
        // 🎞 STICKER ANIMADO → VIDEO
        const output = path.join(tempDir, 'output.mp4');

        const cmd = `ffmpeg -y -i "${input}" -movflags faststart -pix_fmt yuv420p -vf "scale=512:-1:flags=lanczos,fps=15" "${output}"`;

        exec(cmd, async (err) => {
          if (err) {
            console.log('FFMPEG ERROR:', err);
            return sock.sendMessage(remoteJid, {
              text: '❌ Error al convertir sticker animado'
            }, { quoted: msg });
          }

          const video = fs.readFileSync(output);

          await sock.sendMessage(remoteJid, {
            video,
            caption: '🎞 Convertido a video'
          }, { quoted: msg });

          fs.unlinkSync(input);
          fs.unlinkSync(output);
        });

      } else {
        // 🖼 STICKER NORMAL → IMAGEN
        const output = path.join(tempDir, 'output.jpg');

        const cmd = `ffmpeg -y -i "${input}" "${output}"`;

        exec(cmd, async (err) => {
          if (err) {
            console.log('FFMPEG ERROR:', err);
            return sock.sendMessage(remoteJid, {
              text: '❌ Error al convertir sticker'
            }, { quoted: msg });
          }

          const image = fs.readFileSync(output);

          await sock.sendMessage(remoteJid, {
            image,
            caption: '🖼 Convertido a imagen'
          }, { quoted: msg });

          fs.unlinkSync(input);
          fs.unlinkSync(output);
        });
      }

    } catch (err) {
      console.log('ERROR GENERAL:', err);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error general en toimage'
      }, { quoted: msg });
    }
  }
};
