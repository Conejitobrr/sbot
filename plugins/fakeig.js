'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { createCanvas, loadImage } = require('canvas');

const TEMP_DIR = path.join(process.cwd(), 'temp');

function ensureTemp() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

function getMentioned(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
}

function getText(msg) {
  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    ''
  );
}

module.exports = {
  commands: ['fakeig', 'igcoment'],

  async execute({ sock, remoteJid, msg, sender }) {

    try {

      const mentioned = getMentioned(msg)[0];

      if (!mentioned) {
        return sock.sendMessage(remoteJid, {
          text:
`❌ Menciona a alguien.

Ejemplo:
.fakeig @usuario qué hermosa foto 😻`
        }, { quoted: msg });
      }

      const body = getText(msg);

      const comment = body
        .replace(/^[./#!]?(fakeig|igcoment)\s*/i, '')
        .replace(/@\d+/g, '')
        .trim();

      if (!comment) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Escribe el comentario falso de Instagram.'
        }, { quoted: msg });
      }

      ensureTemp();

      let pfp;

      try {
        pfp = await sock.profilePictureUrl(mentioned, 'image');
      } catch {
        pfp = 'https://i.imgur.com/JP3QZ7B.jpeg';
      }

      const username = mentioned
        .split('@')[0]
        .replace(/\D/g, '');

      // 📥 DESCARGAR FOTO
      const response = await axios.get(pfp, {
        responseType: 'arraybuffer'
      });

      const profileBuffer = Buffer.from(response.data);

      // 🎨 CANVAS
      const canvas = createCanvas(1080, 260);
      const ctx = canvas.getContext('2d');

      // Fondo IG
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Foto perfil
      const avatar = await loadImage(profileBuffer);

      ctx.save();

      ctx.beginPath();
      ctx.arc(90, 90, 55, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      ctx.drawImage(avatar, 35, 35, 110, 110);

      ctx.restore();

      // Username
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 38px Sans';

      ctx.fillText(username, 180, 75);

      // Comentario
      ctx.font = '34px Sans';
      ctx.fillStyle = '#111111';

      const text = `${comment}`;

      wrapText(ctx, text, 180, 130, 820, 42);

      // Detalles tipo IG
      ctx.font = '28px Sans';
      ctx.fillStyle = '#8e8e8e';

      ctx.fillText('Hace 1 min', 180, 220);

      const output = path.join(
        TEMP_DIR,
        `fakeig_${Date.now()}.png`
      );

      fs.writeFileSync(output, canvas.toBuffer());

      // 📤 ENVIAR
      await sock.sendMessage(remoteJid, {
        image: fs.readFileSync(output),
        caption: '📸 Comentario falso de Instagram'
      }, { quoted: msg });

      try {
        fs.unlinkSync(output);
      } catch {}

    } catch (err) {

      console.log('❌ Error fakeig:', err?.message || err);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error creando comentario falso.'
      }, { quoted: msg });
    }
  }
};

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {

  const words = text.split(' ');
  let line = '';

  for (let n = 0; n < words.length; n++) {

    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;

    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }

  ctx.fillText(line, x, y);
}
