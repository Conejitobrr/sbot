'use strict';

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

module.exports = {
  commands: ['tts'],

  async execute(ctx) {
    const { sock, msg, remoteJid, args } = ctx;

    try {
      const text = args.join(' ');

      if (!text) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Ejemplo: .tts hola mundo'
        }, { quoted: msg });
      }

      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      const img = path.join(tempDir, 'text.png');
      const webp = path.join(tempDir, 'sticker.webp');

      // 🔥 CALCULAR TAMAÑO AUTOMÁTICO
      const length = text.length;

      let fontSize;

      if (length <= 10) fontSize = 110;
      else if (length <= 20) fontSize = 90;
      else if (length <= 40) fontSize = 70;
      else if (length <= 80) fontSize = 50;
      else fontSize = 35;

      // 🔥 CREAR IMAGEN CON AUTO-AJUSTE
      const createImg = `
      magick -size 512x512 xc:none \
      -gravity center \
      -fill white \
      -stroke black \
      -strokewidth 3 \
      -font DejaVu-Sans-Bold \
      -pointsize ${fontSize} \
      -interline-spacing 4 \
      -annotate +0+0 "${text.replace(/"/g, '\\"')}" \
      "${img}"
      `;

      // 🔥 CONVERTIR A STICKER
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
            if (fs.existsSync(f)) fs.unlinkSync(f);
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
