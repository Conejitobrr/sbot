'use strict';

const Jimp = require('jimp');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const fontCache = new Map();

async function getFont(name) {
  if (!fontCache.has(name)) {
    fontCache.set(name, await Jimp.loadFont(name));
  }
  return fontCache.get(name);
}

function unwrapMessage(message = {}) {
  if (message.ephemeralMessage?.message) {
    return unwrapMessage(message.ephemeralMessage.message);
  }

  if (message.documentWithCaptionMessage?.message) {
    return unwrapMessage(message.documentWithCaptionMessage.message);
  }

  return message;
}

function getQuotedContext(msg) {
  return (
    msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.imageMessage?.contextInfo ||
    msg.message?.videoMessage?.contextInfo ||
    msg.message?.documentMessage?.contextInfo ||
    null
  );
}

function getQuotedMessage(msg) {
  const ctx = getQuotedContext(msg);
  const quoted = ctx?.quotedMessage || null;
  return quoted ? unwrapMessage(quoted) : null;
}

function getMediaInfo(message = {}) {
  if (message.imageMessage) {
    return {
      mediaType: 'image',
      media: message.imageMessage,
      mimetype: message.imageMessage.mimetype || 'image/jpeg'
    };
  }

  if (message.documentMessage) {
    const mimetype = message.documentMessage.mimetype || '';
    if (mimetype.startsWith('image/')) {
      return {
        mediaType: 'document',
        media: message.documentMessage,
        mimetype
      };
    }
  }

  return null;
}

async function streamToBuffer(stream) {
  let buffer = Buffer.from([]);

  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk]);
  }

  return buffer;
}

async function downloadMediaBuffer(mediaInfo) {
  const stream = await downloadContentFromMessage(
    mediaInfo.media,
    mediaInfo.mediaType
  );

  return await streamToBuffer(stream);
}

function drawCircle(image, cx, cy, radius, color) {
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      if ((x * x) + (y * y) <= (radius * radius)) {
        const px = cx + x;
        const py = cy + y;

        if (
          px >= 0 &&
          py >= 0 &&
          px < image.bitmap.width &&
          py < image.bitmap.height
        ) {
          image.setPixelColor(color, px, py);
        }
      }
    }
  }
}

function coverSquare(image, size = 700) {
  return image.clone().cover(size, size);
}

async function effectWanted(source) {
  const fontTitle = await getFont(Jimp.FONT_SANS_64_BLACK);
  const fontSmall = await getFont(Jimp.FONT_SANS_32_BLACK);

  const photo = source
    .clone()
    .cover(680, 760)
    .sepia()
    .contrast(0.2)
    .posterize(28);

  const poster = new Jimp(760, 980, 0xf1dfb7ff);
  const frame = new Jimp(700, 780, 0x2d1c0eff);

  poster.composite(frame, 30, 120);
  poster.composite(photo, 40, 130);

  poster.print(
    fontTitle,
    20,
    25,
    {
      text: 'WANTED',
      alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
    },
    720,
    70
  );

  poster.print(
    fontSmall,
    40,
    915,
    {
      text: 'SE BUSCA',
      alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
    },
    680,
    40
  );

  return poster;
}

async function effectJail(source) {
  const img = coverSquare(source, 700)
    .contrast(0.15)
    .color([{ apply: 'desaturate', params: [20] }]);

  const dark = new Jimp(700, 700, 0x00000035);
  img.composite(dark, 0, 0);

  const barColor = 0x1d1d1de0;
  const shineColor = 0xffffff40;

  for (let x = 45; x < 700; x += 95) {
    const bar = new Jimp(26, 700, barColor);
    const shine = new Jimp(4, 700, shineColor);

    img.composite(bar, x, 0);
    img.composite(shine, x + 4, 0);
  }

  const topBar = new Jimp(700, 25, 0x1d1d1de0);
  const bottomBar = new Jimp(700, 25, 0x1d1d1de0);

  img.composite(topBar, 0, 0);
  img.composite(bottomBar, 0, 675);

  return img;
}

async function effectTriggered(source) {
  const font = await getFont(Jimp.FONT_SANS_64_WHITE);

  const img = coverSquare(source, 700)
    .contrast(0.35)
    .color([
      { apply: 'red', params: [60] },
      { apply: 'saturate', params: [30] }
    ])
    .posterize(18);

  const canvas = new Jimp(700, 820, 0x000000ff);
  const banner = new Jimp(700, 120, 0xd41414ff);

  canvas.composite(img, 0, 0);
  canvas.composite(banner, 0, 700);

  canvas.print(
    font,
    20,
    725,
    {
      text: 'TRIGGERED',
      alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
    },
    660,
    70
  );

  return canvas;
}

async function effectLgbt(source) {
  const img = coverSquare(source, 700);

  const colors = [
    0xe40303ff,
    0xff8c00ff,
    0xffed00ff,
    0x008026ff,
    0x004dffff,
    0x750787ff
  ];

  const stripeHeight = Math.ceil(img.bitmap.height / colors.length);

  for (let i = 0; i < colors.length; i++) {
    const stripe = new Jimp(img.bitmap.width, stripeHeight, colors[i]);
    stripe.opacity(0.28);
    img.composite(stripe, 0, i * stripeHeight);
  }

  return img;
}

async function effectGlitch(source) {
  const base = coverSquare(source, 700)
    .contrast(0.25)
    .color([{ apply: 'saturate', params: [20] }]);

  const result = base.clone();

  for (let i = 0; i < 18; i++) {
    const y = Math.floor(Math.random() * 650);
    const h = 10 + Math.floor(Math.random() * 40);
    const shift = Math.floor(Math.random() * 60) - 30;
    const piece = base.clone().crop(0, y, 700, Math.min(h, 700 - y));

    result.composite(piece, shift, y);
  }

  const red = base.clone().color([{ apply: 'red', params: [80] }]).opacity(0.18);
  const blue = base.clone().color([{ apply: 'blue', params: [80] }]).opacity(0.18);

  result.composite(red, -8, 0);
  result.composite(blue, 8, 0);

  return result;
}

async function effectDistorsion(source) {
  const base = coverSquare(source, 700);
  const result = new Jimp(700, 700, 0x000000ff);

  for (let y = 0; y < 700; y += 12) {
    const h = 12;
    const wave = Math.round(Math.sin(y / 35) * 18);
    const strip = base.clone().crop(0, y, 700, Math.min(h, 700 - y));

    result.composite(strip, wave, y);
  }

  result.blur(1).contrast(0.1);
  return result;
}

async function effectPayaso(source) {
  const img = coverSquare(source, 700);

  const w = img.bitmap.width;
  const h = img.bitmap.height;

  drawCircle(img, Math.floor(w / 2), Math.floor(h / 2) + 20, 45, 0xe11d2eff);
  drawCircle(img, Math.floor(w / 2) - 110, Math.floor(h / 2) + 35, 28, 0xff7aa2cc);
  drawCircle(img, Math.floor(w / 2) + 110, Math.floor(h / 2) + 35, 28, 0xff7aa2cc);
  drawCircle(img, Math.floor(w / 2) + 15, Math.floor(h / 2), 10, 0xffffffff);

  return img;
}

async function effectBasura(source) {
  const font = await getFont(Jimp.FONT_SANS_64_WHITE);

  const img = coverSquare(source, 700)
    .greyscale()
    .contrast(0.25)
    .brightness(-0.1);

  const overlay = new Jimp(700, 700, 0x2b2b2b66);
  img.composite(overlay, 0, 0);

  const top = new Jimp(700, 100, 0x111111dd);
  img.composite(top, 0, 0);

  img.print(
    font,
    20,
    18,
    {
      text: 'BASURA',
      alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
    },
    660,
    70
  );

  return img;
}

async function effectBonito(source) {
  const img = coverSquare(source, 700)
    .blur(1)
    .brightness(0.08)
    .contrast(0.08)
    .color([
      { apply: 'saturate', params: [12] },
      { apply: 'orange', params: [10] }
    ]);

  const glow = img.clone().blur(8).opacity(0.15);
  img.composite(glow, 0, 0);

  return img;
}

const handlers = {
  wanted: effectWanted,
  jail: effectJail,
  triggered: effectTriggered,
  lgbt: effectLgbt,
  glitch: effectGlitch,
  distorsion: effectDistorsion,
  payaso: effectPayaso,
  basura: effectBasura,
  bonito: effectBonito
};

module.exports = {
  commands: [
    'wanted',
    'jail',
    'triggered',
    'lgbt',
    'glitch',
    'distorsion',
    'payaso',
    'basura',
    'bonito'
  ],

  async execute({ sock, msg, remoteJid, command }) {
    try {
      const quoted = getQuotedMessage(msg);

      if (!quoted) {
        return sock.sendMessage(remoteJid, {
          text:
`❌ Responde a una imagen para usar este comando.

Comandos disponibles:
.wanted
.jail
.triggered
.lgbt
.glitch
.distorsion
.payaso
.basura
.bonito`
        }, { quoted: msg });
      }

      const mediaInfo = getMediaInfo(quoted);

      if (!mediaInfo) {
        return sock.sendMessage(remoteJid, {
          text: '❌ El mensaje citado no contiene una imagen válida.'
        }, { quoted: msg });
      }

      const buffer = await downloadMediaBuffer(mediaInfo);

      if (!buffer || !buffer.length) {
        return sock.sendMessage(remoteJid, {
          text: '❌ No se pudo descargar la imagen.'
        }, { quoted: msg });
      }

      const image = await Jimp.read(buffer);
      const effect = handlers[String(command).toLowerCase()];

      if (!effect) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Filtro no válido.'
        }, { quoted: msg });
      }

      const result = await effect(image);
      const output = await result.quality(95).getBufferAsync(Jimp.MIME_JPEG);

      await sock.sendMessage(remoteJid, {
        image: output,
        caption: `✅ Filtro aplicado: *${command}*`
      }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error en filtroimg:', err?.message || err);

      return sock.sendMessage(remoteJid, {
        text: '❌ Ocurrió un error aplicando el filtro.'
      }, { quoted: msg });
    }
  }
};
