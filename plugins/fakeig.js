'use strict';

const { createCanvas, loadImage } = require('canvas');

module.exports = {
  commands: ['fakeig', 'igcomment'],

  async execute(ctx) {
    const { sock, msg, remoteJid, args } = ctx;

    try {
      const context = msg.message?.extendedTextMessage?.contextInfo;
      const mentioned = context?.mentionedJid?.[0];

      if (!mentioned) {
        return sock.sendMessage(remoteJid, {
          text:
`📸 *Fake comentario de Instagram*

Uso:
.fakeig @persona texto del comentario

Ejemplo:
.fakeig @persona Este bot está god 🔥`
        }, { quoted: msg });
      }

      // Texto comentario
      let commentText = args.join(' ')
        .replace(/@\d+/g, '')
        .trim();

      if (!commentText) {
        commentText = 'Comentario de Instagram 🖤';
      }

      // Obtener nombre/nick de WhatsApp
      let username = mentioned.split('@')[0];

      try {
        const contact =
          sock.contacts?.[mentioned] ||
          sock.store?.contacts?.[mentioned];

        username =
          contact?.notify ||
          contact?.name ||
          contact?.verifiedName ||
          username;
      } catch {}

      // Limpiar espacios
      username = username.replace(/\s+/g, '_');

      // Foto perfil
      let ppBuffer = null;

      try {
        const ppUrl = await sock.profilePictureUrl(mentioned, 'image');
        const res = await fetch(ppUrl);
        ppBuffer = Buffer.from(await res.arrayBuffer());
      } catch {}

      // Canvas
      const width = 900;
      const height = 360;

      const canvas = createCanvas(width, height);
      const ctx2d = canvas.getContext('2d');

      // Fondo
      ctx2d.fillStyle = '#ffffff';
      ctx2d.fillRect(0, 0, width, height);

      // Header Instagram
      ctx2d.fillStyle = '#111';
      ctx2d.font = 'bold 32px Arial';
      ctx2d.fillText('Comentarios', 40, 55);

      ctx2d.strokeStyle = '#e5e5e5';
      ctx2d.lineWidth = 2;

      ctx2d.beginPath();
      ctx2d.moveTo(0, 80);
      ctx2d.lineTo(width, 80);
      ctx2d.stroke();

      // Avatar
      const avatarX = 45;
      const avatarY = 115;
      const avatarSize = 74;

      ctx2d.save();

      ctx2d.beginPath();
      ctx2d.arc(
        avatarX + avatarSize / 2,
        avatarY + avatarSize / 2,
        avatarSize / 2,
        0,
        Math.PI * 2
      );

      ctx2d.closePath();
      ctx2d.clip();

      if (ppBuffer) {
        const img = await loadImage(ppBuffer);
        ctx2d.drawImage(img, avatarX, avatarY, avatarSize, avatarSize);
      } else {
        ctx2d.fillStyle = '#ddd';
        ctx2d.fillRect(avatarX, avatarY, avatarSize, avatarSize);

        ctx2d.fillStyle = '#777';
        ctx2d.font = 'bold 34px Arial';
        ctx2d.textAlign = 'center';

        ctx2d.fillText(
          username.charAt(0).toUpperCase(),
          avatarX + 37,
          avatarY + 49
        );

        ctx2d.textAlign = 'left';
      }

      ctx2d.restore();

      // Usuario IG
      const textX = 140;
      const textY = 135;

      ctx2d.fillStyle = '#111';
      ctx2d.font = 'bold 25px Arial';

      ctx2d.fillText(username, textX, textY);

      // Comentario
      ctx2d.fillStyle = '#222';
      ctx2d.font = '25px Arial';

      wrapText(
        ctx2d,
        commentText,
        textX,
        textY + 38,
        670,
        34
      );

      // Footer
      ctx2d.fillStyle = '#8e8e8e';
      ctx2d.font = '21px Arial';

      ctx2d.fillText(
        '1 min   Me gusta   Responder',
        textX,
        280
      );

      // Corazón IG
      ctx2d.fillStyle = '#999';
      ctx2d.font = '32px Arial';
      ctx2d.fillText('♡', 820, 155);

      // Imagen final
      const buffer = canvas.toBuffer('image/png');

      await sock.sendMessage(remoteJid, {
        image: buffer,
        caption:
`📸 *Comentario fake de Instagram*
👤 @${username}`,
        mentions: [mentioned]
      }, { quoted: msg });

    } catch (e) {
      console.error('Error en fakeig:', e);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error creando el comentario fake.'
      }, { quoted: msg });
    }
  }
};

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';

  for (const word of words) {
    const testLine = line + word + ' ';
    const width = ctx.measureText(testLine).width;

    if (width > maxWidth && line.length > 0) {
      ctx.fillText(line, x, y);
      line = word + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }

  ctx.fillText(line, x, y);
}
