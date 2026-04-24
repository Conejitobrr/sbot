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

      const media = message.imageMessage;

      const stream = await downloadContentFromMessage(media, 'image');

      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      const input = path.join(tempDir, 'input.jpg');
      const output = path.join(tempDir, 'anime.png');

      fs.writeFileSync(input, buffer);

      // 🔥 EFECTO ANIME (ARREGLADO)
      const cmd = `
      magick "${input}" \
      -resize 512x512 \
      -colorspace RGB \
      -posterize 5 \
      -edge 1 \
      -auto-level \
      -sharpen 0x1 \
      "${output}"
      `;

      exec(cmd, async (err) => {
        if (err) {
          console.log('ANIME ERROR:', err);

          return sock.sendMessage(remoteJid, {
            text: '❌ Error aplicando filtro anime'
          }, { quoted: msg });
        }

        try {
          const img = fs.readFileSync(output);

          await sock.sendMessage(remoteJid, {
            image: img,
            caption: '✨ Anime filter aplicado'
          }, { quoted: msg });

        } catch (e) {
          console.log('SEND ERROR:', e);
        }

        [input, output].forEach(f => {
          if (fs.existsSync(f)) fs.unlinkSync(f);
        });
      });

    } catch (err) {
      console.log('ERROR GENERAL:', err);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error general en toanime'
      }, { quoted: msg });
    }
  }
};
