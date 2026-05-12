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

      // 🔥 LETRAS MÁS GRANDES Y ADAPTABLES
      if (length <= 6) fontSize = 220;
      else if (length <= 12) fontSize = 180;
      else if (length <= 20) fontSize = 140;
      else if (length <= 35) fontSize = 110;
      else if (length <= 60) fontSize = 85;
      else if (length <= 100) fontSize = 65;
      else fontSize = 50;

      // 🔥 TEXTO AUTO-AJUSTABLE DENTRO DEL CUADRO
      const createImg = `
      magick -background none \
      -fill white \
      -stroke black \
      -strokewidth 5 \
      -font DejaVu-Sans-Bold \
      -size 470x470 \
      -gravity center \
      -pointsize ${fontSize} \
      -interline-spacing 6 \
      caption:"${text.replace(/"/g, '\\"')}" \
      -gravity center \
      -extent 512x512 \
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
