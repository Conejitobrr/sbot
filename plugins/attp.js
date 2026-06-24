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

      const img = path.join(tempDir, `text_${Date.now()}.png`);
      const webp = path.join(tempDir, `sticker_${Date.now()}.webp`);

      const length = text.length;

      let fontSize;

      if (length <= 3) fontSize = 260;
      else if (length <= 5) fontSize = 230;
      else if (length <= 8) fontSize = 200;
      else if (length <= 12) fontSize = 170;
      else if (length <= 18) fontSize = 140;
      else if (length <= 30) fontSize = 110;
      else if (length <= 50) fontSize = 85;
      else if (length <= 80) fontSize = 65;
      else fontSize = 50;

      const safeText = text
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/`/g, '\\`');

      // 🔥 CAMBIO CLAVE AQUÍ: Se usa "convert" en lugar de "magick"
      const createImg = `
      convert -background none \
      -fill white \
      -stroke black \
      -strokewidth 6 \
      -font DejaVu-Sans-Bold \
      -size 1200x1200 \
      -gravity center \
      -pointsize ${fontSize} \
      -interline-spacing 8 \
      caption:"${safeText}" \
      -trim +repage \
      -resize 440x440\\> \
      -gravity center \
      -background none \
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
            text: '❌ Error creando imagen. Asegúrate de tener instalado ImageMagick.'
          }, { quoted: msg });
        }

        exec(toSticker, async (err2) => {
          if (err2) {
            console.log('WEBP ERROR:', err2);
            return sock.sendMessage(remoteJid, {
              text: '❌ Error creando sticker. Asegúrate de tener instalado ffmpeg.'
            }, { quoted: msg });
          }

          try {
            await sock.sendMessage(remoteJid, {
              sticker: fs.readFileSync(webp)
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
