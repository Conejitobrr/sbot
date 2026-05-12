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

      // 🔥 CALCULAR TAMAÑO MÁS INTELIGENTE
      const length = text.length;

      let fontSize;

      // 🔥 AJUSTE AUTOMÁTICO PARA QUE SIEMPRE ENTRE
      if (length <= 5) fontSize = 230;
      else if (length <= 10) fontSize = 190;
      else if (length <= 18) fontSize = 150;
      else if (length <= 30) fontSize = 120;
      else if (length <= 45) fontSize = 95;
      else if (length <= 70) fontSize = 75;
      else if (length <= 100) fontSize = 58;
      else if (length <= 140) fontSize = 46;
      else fontSize = 38;

      // 🔥 TEXTO AUTO-AJUSTABLE DENTRO DEL CUADRO
      const createImg = `
      magick -background none \
      -fill white \
      -stroke black \
      -strokewidth 5 \
      -font DejaVu-Sans-Bold \
      -size 440x440 \
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
