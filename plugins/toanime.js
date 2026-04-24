'use strict';

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
  commands: ['toanime'],

  async execute(ctx) {
    const { sock, msg, remoteJid } = ctx;

    try {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const message = quoted || msg.message;

      const type = Object.keys(message || {})[0];

      if (!type || type !== 'imageMessage') {
        return sock.sendMessage(remoteJid, {
          text: '❌ Responde a una imagen con .toanime'
        }, { quoted: msg });
      }

      const media = message[type];

      const stream = await downloadContentFromMessage(media, 'image');

      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      const input = path.join(tempDir, 'input.jpg');
      const output = path.join(tempDir, 'anime.jpg');

      fs.writeFileSync(input, buffer);

      // 🎨 FILTRO ANIME LOCAL (SIN IA)
      await new Promise((resolve, reject) => {
        const cmd = `
          magick "${input}" \
          -resize 512x512 \
          -modulate 110,120,100 \
          -sharpen 0x1 \
          -contrast \
          -edge 1 \
          -colorspace RGB \
          -posterize 12 \
          "${output}"
        `;

        exec(cmd, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      await sock.sendMessage(remoteJid, {
        image: fs.readFileSync(output),
        caption: '✨ Anime aplicado (modo local sin API)'
      }, { quoted: msg });

      fs.unlinkSync(input);
      fs.unlinkSync(output);

    } catch (err) {
      console.log('LOCAL ANIME ERROR:', err.message);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error en filtro local (¿tienes ImageMagick instalado?)'
      }, { quoted: msg });
    }
  }
};
