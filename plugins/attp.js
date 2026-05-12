'use strict';

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

module.exports = {
  commands: ['attp'],

  async execute(ctx) {
    const { sock, msg, remoteJid, args } = ctx;

    try {
      const text = args.join(' ');

      if (!text) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Ejemplo: .attp hola mundo'
        }, { quoted: msg });
      }

      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      const img = path.join(tempDir, 'text.png');
      const webp = path.join(tempDir, 'sticker.webp');

      const length = text.length;

      let fontSize;

      // 🔥 Ajustado para que NO se corte en palabras largas
      if (length <= 3) fontSize = 210;
      else if (length <= 5) fontSize = 170;
      else if (length <= 8) fontSize = 125;
      else if (length <= 12) fontSize = 100;
      else if (length <= 18) fontSize = 82;
      else if (length <= 30) fontSize = 65;
      else if (length <= 50) fontSize = 50;
      else if (length <= 80) fontSize = 38;
      else fontSize = 30;

      const safeText = text
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/`/g, '\\`');

      // 🔥 Más margen para que no corte bordes
      const createImg = `
      magick -background none \
      -fill white \
      -stroke black \
      -strokewidth 4 \
      -font DejaVu-Sans-Bold \
      -size 400x400 \
      -gravity center \
      -pointsize ${fontSize} \
      -interline-spacing 4 \
      caption:"${safeText}" \
      -gravity center \
      -extent 512x512 \
      "${img}"
      `;

      const toSticker = `
      ffmpeg -y -i "${img}" \
      -vcodec libwebp \
      -vf "scale=512:512:flags=lanczos,format=rgba" \
      -q:v 90 \
      -compression_level 6 \
      -preset picture \
      -loop 0 \
      "${webp}"
      `;

      exec(createImg, (err1) => {
        if (err1) {
          console.log('IMG ERROR:', err1);
          return sock.sendMessage(remoteJid, {
            text: '❌ Error creando imagen'
          }, { quoted: msg });
        }

        exec(toSticker, async (err2) => {
          if (err2) {
            console.log('WEBP ERROR:', err2);
            return sock.sendMessage(remoteJid, {
              text: '❌ Error creando sticker'
            }, { quoted: msg });
          }

          try {
            const sticker = fs.readFileSync(webp);

            await sock.sendMessage(remoteJid, {
              sticker
            }, { quoted: msg });

          } catch (e) {
            console.log('SEND ERROR:', e);
          }

          [img, webp].forEach(f => {
            try {
              if (fs.existsSync(f)) fs.unlinkSync(f);
            } catch {}
          });
        });
      });

    } catch (err) {
      console.log('ERROR GENERAL:', err);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error general'
      }, { quoted: msg });
    }
  }
};
