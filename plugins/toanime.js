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
          text: 'Responde a una imagen con .toanime'
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

      // 🔥 FILTRO ESTILO ANIME MEJORADO (COLOR + SUAVIZADO)
      const cmd = `
        magick "${input}" \
        -resize 512x512 \
        -colorspace RGB \
        -brightness-contrast 10x20 \
        -modulate 110,120,100 \
        -posterize 6 \
        -bilateral-blur 0x3 \
        -sharpen 0x1 \
        "${output}"
      `;

      exec(cmd, async (err) => {
        if (err) {
          console.log('ANIME ERROR:', err);
          return sock.sendMessage(remoteJid, {
            text: '❌ Error al aplicar filtro anime'
          }, { quoted: msg });
        }

        const img = fs.readFileSync(output);

        await sock.sendMessage(remoteJid, {
          image: img,
          caption: '✨ Anime style aplicado'
        }, { quoted: msg });

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
