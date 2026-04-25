'use strict';

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const db = require('../lib/database');

// 👉 eventos opcional
let events = null;
try {
  events = require('../lib/events');
} catch {}

module.exports = {
  commands: ['s'],

  async execute(ctx) {
    const { sock, msg, remoteJid, sender } = ctx;

    try {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const message = quoted || msg.message;

      const type = Object.keys(message || {})[0];

      if (!type || (type !== 'imageMessage' && type !== 'videoMessage')) {
        return sock.sendMessage(remoteJid, {
          text: 'Responde a imagen/video/gif con .s'
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

      const input = path.join(tempDir, `input.${isImage ? 'jpg' : 'mp4'}`);
      const output = path.join(tempDir, 'output.webp');

      fs.writeFileSync(input, buffer);

      const cmd = isImage
        ? `ffmpeg -y -i "${input}" -vf "scale=512:512:force_original_aspect_ratio=decrease:flags=lanczos,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" -vcodec libwebp -q:v 60 -compression_level 6 -preset picture -loop 0 "${output}"`
        : `ffmpeg -y -i "${input}" -t 4 -vf "scale=512:512:force_original_aspect_ratio=decrease:flags=lanczos,fps=10,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" -vcodec libwebp -fs 700k -loop 0 -an "${output}"`;

      exec(cmd, async (err) => {
        if (err) {
          console.log('FFMPEG CMD ERROR:', err);

          return sock.sendMessage(remoteJid, {
            text: '❌ Error real de ffmpeg'
          }, { quoted: msg });
        }

        try {
          const sticker = fs.readFileSync(output);

          await sock.sendMessage(remoteJid, {
            sticker
          }, { quoted: msg });

          // ⭐ XP BASE
          let xp = Math.floor(Math.random() * 10) + 5;

          // ⚡ DOUBLE XP SI HAY EVENTO
          if (events?.state?.active?.type === 'double') {
            xp *= 2;
          }

          await db.addXP(sender, xp);

        } catch (e) {
          console.log('SEND ERROR:', e);
        }

        fs.unlinkSync(input);
        fs.unlinkSync(output);
      });

    } catch (err) {
      console.log('GENERAL ERROR:', err);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error general'
      }, { quoted: msg });
    }
  }
};
