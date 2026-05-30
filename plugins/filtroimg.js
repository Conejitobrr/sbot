'use strict';

const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const JimpModule = require('jimp');
const Jimp = JimpModule.Jimp || JimpModule;

const loadFont = JimpModule.loadFont || Jimp.loadFont;
const measureTextHeight =
  JimpModule.measureTextHeight ||
  Jimp.measureTextHeight ||
  function () {
    return 40;
  };

const ASSETS_DIR = path.join(process.cwd(), 'assets');

const CMDS = [
  'wanted',
  'jail',
  'triggered',
  'lgbt',
  'glitch',
  'distorsion',
  'basura',
  'payaso',
  'bonito'
];

function rgba(r, g, b, a = 255) {
  if (typeof Jimp.rgbaToInt === 'function') {
    return Jimp.rgbaToInt(r, g, b, a);
  }

  if (typeof JimpModule.rgbaToInt === 'function') {
    return JimpModule.rgbaToInt(r, g, b, a);
  }

  return ((r & 255) << 24) | ((g & 255) << 16) | ((b & 255) << 8) | (a & 255);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function assetPath(name) {
  return path.join(ASSETS_DIR, name);
}

function assetExists(name) {
  return fs.existsSync(assetPath(name));
}

async function loadAsset(name) {
  try {
    if (!assetExists(name)) {
      console.log(`⚠️ Asset no encontrado: ${name}`);
      return null;
    }

    return await Jimp.read(assetPath(name));

  } catch (err) {
    console.log(`⚠️ No se pudo cargar asset ${name}:`, err?.message || err);
    return null;
  }
}

async function loadBestFont(type = 'black', size = '32') {
  const names = [
    `FONT_SANS_${size}_${type.toUpperCase()}`,
    `FONT_SANS_${size}_BLACK`,
    `FONT_SANS_${size}_WHITE`,
    'FONT_SANS_32_BLACK',
    'FONT_SANS_32_WHITE'
  ];

  for (const name of names) {
    const key = Jimp[name] || JimpModule[name];
    if (!key) continue;

    try {
      return await loadFont(key);
    } catch {}
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

function getQuotedContext(msg) {
  return (
    msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.imageMessage?.contextInfo ||
    msg.message?.videoMessage?.contextInfo ||
    msg.message?.documentMessage?.contextInfo ||
    msg.message?.stickerMessage?.contextInfo ||
    null
  );
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

function getQuotedMessage(msg) {
  const ctx = getQuotedContext(msg);
  const quoted = ctx?.quotedMessage || null;

  return quoted ? unwrapMessage(quoted) : null;
}

function getMediaInfo(message = {}) {
  if (message.imageMessage) {
    return {
      kind: 'image',
      mediaType: 'image',
      media: message.imageMessage,
      mimetype: message.imageMessage.mimetype || 'image/jpeg'
    };
  }

  if (message.stickerMessage) {
    return {
      kind: 'sticker',
      mediaType: 'sticker',
      media: message.stickerMessage,
      mimetype: message.stickerMessage.mimetype || 'image/webp'
    };
  }

  if (message.documentMessage) {
    const mime = message.documentMessage.mimetype || '';

    if (mime.startsWith('image/')) {
      return {
        kind: 'document',
        mediaType: 'document',
        media: message.documentMessage,
        mimetype: mime
      };
    }
  }

  return null;
}

async function readInputImage(msg) {
  const quoted = getQuotedMessage(msg);
  const target = quoted || unwrapMessage(msg.message || {});
  const mediaInfo = getMediaInfo(target);

  if (!mediaInfo) return null;

  const stream = await downloadContentFromMessage(
    mediaInfo.media,
    mediaInfo.mediaType
  );

  const buffer = await streamToBuffer(stream);

  if (!buffer || !buffer.length) return null;

  try {
    return await Jimp.read(buffer);
  } catch (err) {
    console.log('⚠️ No se pudo leer la imagen enviada:', err?.message || err);
    return null;
  }
}

function cover(img, w, h) {
  return img.clone().cover(w, h);
}

function contain(img, w, h) {
  return img.clone().contain(w, h);
}

function drawRect(base, x, y, w, h, color, opacity = 1) {
  const rect = new Jimp(w, h, color);
  rect.opacity(opacity);
  base.composite(rect, x, y);
}

function applyNoise(base, amount = 10) {
  base.scan(0, 0, base.bitmap.width, base.bitmap.height, function (x, y, idx) {
    const delta = Math.floor((Math.random() - 0.5) * amount);

    this.bitmap.data[idx + 0] = clamp(this.bitmap.data[idx + 0] + delta, 0, 255);
    this.bitmap.data[idx + 1] = clamp(this.bitmap.data[idx + 1] + delta, 0, 255);
    this.bitmap.data[idx + 2] = clamp(this.bitmap.data[idx + 2] + delta, 0, 255);
  });
}

function applyVignette(base, strength = 0.55) {
  const w = base.bitmap.width;
  const h = base.bitmap.height;
  const cx = w / 2;
  const cy = h / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);

  base.scan(0, 0, w, h, function (x, y, idx) {
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const ratio = dist / maxDist;
    const darken = 1 - Math.pow(ratio, 1.7) * strength;

    this.bitmap.data[idx + 0] = clamp(Math.round(this.bitmap.data[idx + 0] * darken), 0, 255);
    this.bitmap.data[idx + 1] = clamp(Math.round(this.bitmap.data[idx + 1] * darken), 0, 255);
    this.bitmap.data[idx + 2] = clamp(Math.round(this.bitmap.data[idx + 2] * darken), 0, 255);
  });
}

function addSoftLight(base, opacity = 0.18) {
  const glow = base.clone().blur(18).brightness(0.08).opacity(opacity);
  base.composite(glow, 0, 0);
}

function drawCircle(base, cx, cy, radius, color, opacity = 1) {
  const circle = new Jimp(radius * 2, radius * 2, 0x00000000);

  circle.scan(0, 0, circle.bitmap.width, circle.bitmap.height, function (x, y, idx) {
    const dx = x - radius;
    const dy = y - radius;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= radius) {
      this.bitmap.data[idx + 0] = (color >> 24) & 255;
      this.bitmap.data[idx + 1] = (color >> 16) & 255;
      this.bitmap.data[idx + 2] = (color >> 8) & 255;
      this.bitmap.data[idx + 3] = Math.round(((color & 255) || 255) * opacity);
    }
  });

  base.composite(circle, cx - radius, cy - radius);
}

function isolateChannel(img, mode = 'red') {
  const out = img.clone();

  out.scan(0, 0, out.bitmap.width, out.bitmap.height, function (x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];

    if (mode === 'red') {
      this.bitmap.data[idx + 0] = r;
      this.bitmap.data[idx + 1] = 0;
      this.bitmap.data[idx + 2] = 0;
    } else if (mode === 'cyan') {
      this.bitmap.data[idx + 0] = 0;
      this.bitmap.data[idx + 1] = g;
      this.bitmap.data[idx + 2] = b;
    }
  });

  return out;
}

async function renderText(base, text, x, y, maxWidth, align = 'center', color = 'black', size = '32') {
  const font = await loadBestFont(color, size);
  if (!font) return;

  const alignmentX =
    align === 'left' ? Jimp.HORIZONTAL_ALIGN_LEFT :
    align === 'right' ? Jimp.HORIZONTAL_ALIGN_RIGHT :
    Jimp.HORIZONTAL_ALIGN_CENTER;

  const height = measureTextHeight(font, text, maxWidth);

  base.print(
    font,
    x,
    y,
    {
      text,
      alignmentX,
      alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
    },
    maxWidth,
    height + 20
  );
}

/* ===========================
   FILTROS
=========================== */

async function makeWanted(input) {
  const W = 1000;
  const H = 1400;

  const base = new Jimp(W, H, rgba(214, 191, 142, 255));
  applyNoise(base, 18);
  applyVignette(base, 0.22);

  const photoShadow = new Jimp(660, 760, rgba(0, 0, 0, 160)).blur(18);
  base.composite(photoShadow, 170, 230);

  const photo = cover(input, 620, 720)
    .greyscale()
    .sepia()
    .contrast(0.25)
    .brightness(0.02);

  base.composite(photo, 190, 250);

  drawRect(base, 185, 245, 630, 730, rgba(77, 49, 18, 255), 0.18);
  drawRect(base, 180, 240, 640, 740, rgba(92, 62, 28, 255), 0.2);

  const frame = await loadAsset('wanted_frame.png');

  if (frame) {
    frame.resize(W, H);
    base.composite(frame, 0, 0);
  }

  await renderText(base, 'WANTED', 40, 40, 920, 'center', 'black', '64');
  await renderText(base, 'DEAD OR ALIVE', 40, 135, 920, 'center', 'black', '32');
  await renderText(base, '$100,000 REWARD', 70, 1030, 860, 'center', 'black', '32');
  await renderText(base, 'MOST WANTED OUTLAW', 70, 1115, 860, 'center', 'black', '32');

  applyVignette(base, 0.26);

  return base.quality(92);
}

async function makeJail(input) {
  const W = 1000;
  const H = 1300;

  const base = cover(input, W, H)
    .contrast(0.22)
    .brightness(-0.08);

  base.color([
    { apply: 'desaturate', params: [10] },
    { apply: 'blue', params: [12] }
  ]);

  drawRect(base, 0, 0, W, H, rgba(15, 25, 40, 255), 0.20);
  addSoftLight(base, 0.14);
  applyVignette(base, 0.45);

  const light = new Jimp(W, H, 0x00000000);

  light.scan(0, 0, W, H, function (x, y, idx) {
    const dx = x - W / 2;
    const dy = y - H / 2;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const max = Math.sqrt((W / 2) ** 2 + (H / 2) ** 2);
    const alpha = clamp(130 - Math.floor((dist / max) * 180), 0, 90);

    this.bitmap.data[idx + 0] = 200;
    this.bitmap.data[idx + 1] = 220;
    this.bitmap.data[idx + 2] = 255;
    this.bitmap.data[idx + 3] = alpha;
  });

  base.composite(light, 0, 0);

  const bars = await loadAsset('jail_bars.png');

  if (bars) {
    bars.resize(W, H);
    bars.opacity(0.97);
    base.composite(bars, 0, 0);
  } else {
    for (let x = 70; x < W; x += 115) {
      const bar = new Jimp(22, H, rgba(30, 30, 35, 255));
      const shine = new Jimp(6, H, rgba(210, 210, 220, 100));

      base.composite(bar, x, 0);
      base.composite(shine, x + 4, 0);
    }
  }

  drawRect(base, 0, 0, W, 130, rgba(0, 0, 0, 170), 1);
  await renderText(base, 'ARRESTED', 30, 28, 940, 'center', 'white', '64');

  return base.quality(92);
}

async function makeTriggered(input) {
  const W = 900;
  const H = 900;

  const face = cover(input, W, 760)
    .contrast(0.35)
    .brightness(0.02);

  face.color([
    { apply: 'red', params: [25] },
    { apply: 'saturate', params: [30] }
  ]);

  const base = new Jimp(W, H, rgba(30, 10, 10, 255));
  base.composite(face, 0, 0);

  const red = isolateChannel(face, 'red').opacity(0.35);
  const cyan = isolateChannel(face, 'cyan').opacity(0.35);

  base.composite(red, -8, 0);
  base.composite(cyan, 8, 0);

  for (let i = 0; i < 14; i++) {
    const y = Math.floor(Math.random() * 650);
    const h = Math.floor(Math.random() * 28) + 10;
    const slice = base.clone().crop(0, y, W, h);
    const offset = Math.floor(Math.random() * 40) - 20;

    base.composite(slice, offset, y);
  }

  drawRect(base, 0, 0, W, 760, rgba(255, 0, 0, 255), 0.08);
  applyNoise(base, 22);
  applyVignette(base, 0.22);

  const trig = await loadAsset('triggered_bar.png');

  if (trig) {
    trig.resize(W, 140);
    base.composite(trig, 0, H - 140);
  } else {
    drawRect(base, 0, H - 140, W, 140, rgba(184, 0, 0, 255), 1);
    await renderText(base, 'TRIGGERED', 20, H - 110, W - 40, 'center', 'white', '64');
  }

  return base.quality(90);
}

async function makeLGBT(input) {
  const W = 1000;
  const H = 1200;

  const base = cover(input, W, H).contrast(0.1);

  const colors = [
    rgba(228, 3, 3, 255),
    rgba(255, 140, 0, 255),
    rgba(255, 237, 0, 255),
    rgba(0, 128, 38, 255),
    rgba(0, 77, 255, 255),
    rgba(117, 7, 135, 255)
  ];

  const band = Math.ceil(H / colors.length);

  colors.forEach((color, i) => {
    drawRect(base, 0, i * band, W, band, color, 0.22);
  });

  addSoftLight(base, 0.18);
  applyVignette(base, 0.28);

  return base.quality(92);
}

async function makeGlitch(input) {
  const W = 1000;
  const H = 1000;

  const base = cover(input, W, H).contrast(0.2);

  const red = isolateChannel(base, 'red').opacity(0.28);
  const cyan = isolateChannel(base, 'cyan').opacity(0.28);

  base.composite(red, -10, 0);
  base.composite(cyan, 10, 0);

  for (let i = 0; i < 22; i++) {
    const y = Math.floor(Math.random() * H);
    const h = Math.floor(Math.random() * 40) + 8;
    const offset = Math.floor(Math.random() * 60) - 30;
    const slice = base.clone().crop(0, y, W, h);

    base.composite(slice, offset, y);

    if (Math.random() > 0.55) {
      drawRect(
        base,
        0,
        y,
        W,
        Math.max(2, Math.floor(h / 5)),
        rgba(
          Math.random() > 0.5 ? 0 : 255,
          Math.random() > 0.5 ? 255 : 0,
          255,
          255
        ),
        0.28
      );
    }
  }

  applyNoise(base, 14);
  applyVignette(base, 0.18);

  return base.quality(90);
}

async function makeDistorsion(input) {
  const W = 900;
  const H = 900;

  const src = cover(input, W, H);
  const out = new Jimp(W, H, rgba(0, 0, 0, 255));

  out.scan(0, 0, W, H, function (x, y) {
    const dx = Math.sin(y / 26) * 18 + Math.sin(y / 8) * 4;
    const dy = Math.cos(x / 30) * 12 + Math.sin(x / 18) * 3;

    const sx = clamp(Math.round(x + dx), 0, W - 1);
    const sy = clamp(Math.round(y + dy), 0, H - 1);

    const color = src.getPixelColor(sx, sy);
    out.setPixelColor(color, x, y);
  });

  const red = isolateChannel(out, 'red').opacity(0.15);
  const cyan = isolateChannel(out, 'cyan').opacity(0.15);

  out.composite(red, -6, 0);
  out.composite(cyan, 6, 0);

  out.contrast(0.18);
  applyVignette(out, 0.18);

  return out.quality(90);
}

async function makePayaso(input) {
  const W = 1000;
  const H = 1200;

  const base = cover(input, W, H)
    .contrast(0.08)
    .brightness(0.03);

  base.color([
    { apply: 'saturate', params: [18] }
  ]);

  addSoftLight(base, 0.14);

  const nose = await loadAsset('clown_nose.png');

  if (nose) {
    const size = 180;

    nose.resize(size, Jimp.AUTO);
    nose.opacity(0.96);

    base.composite(
      nose,
      Math.floor(W / 2 - nose.bitmap.width / 2),
      Math.floor(H / 2 - 10)
    );
  } else {
    drawCircle(base, Math.floor(W / 2), Math.floor(H / 2 + 30), 70, rgba(230, 20, 35, 255), 0.95);
  }

  drawCircle(base, Math.floor(W / 2 - 145), Math.floor(H / 2 + 35), 34, rgba(255, 80, 120, 255), 0.42);
  drawCircle(base, Math.floor(W / 2 + 145), Math.floor(H / 2 + 35), 34, rgba(255, 80, 120, 255), 0.42);

  drawRect(base, Math.floor(W / 2 - 170), Math.floor(H / 2 - 165), 110, 10, rgba(30, 30, 30, 255), 0.75);
  drawRect(base, Math.floor(W / 2 + 60), Math.floor(H / 2 - 165), 110, 10, rgba(30, 30, 30, 255), 0.75);

  applyVignette(base, 0.18);

  return base.quality(92);
}

async function makeBasura(input) {
  const W = 1000;
  const H = 1300;

  const base = new Jimp(W, H, rgba(32, 32, 32, 255));

  drawRect(base, 0, 0, W, H, rgba(48, 48, 48, 255), 1);
  drawRect(base, 0, 0, W, 220, rgba(70, 70, 70, 255), 0.25);

  const shadow = new Jimp(640, 720, rgba(0, 0, 0, 170)).blur(30);
  base.composite(shadow, 210, 390);

  drawRect(base, 220, 330, 560, 650, rgba(88, 88, 92, 255), 1);
  drawRect(base, 245, 295, 510, 55, rgba(120, 120, 125, 255), 1);

  for (let i = 0; i < 6; i++) {
    drawRect(base, 290 + i * 70, 360, 24, 570, rgba(130, 130, 138, 255), 0.42);
  }

  const photo = contain(input, 430, 430)
    .rotate(-18, false)
    .brightness(-0.02)
    .contrast(0.1);

  const picShadow = new Jimp(photo.bitmap.width + 24, photo.bitmap.height + 24, rgba(0, 0, 0, 150)).blur(18);

  base.composite(picShadow, 320, 500);
  base.composite(photo, 335, 510);

  applyNoise(base, 10);
  applyVignette(base, 0.30);

  await renderText(base, 'TRASH', 0, 70, W, 'center', 'white', '64');

  return base.quality(92);
}

async function makeBonito(input) {
  const W = 1000;
  const H = 1300;

  const base = cover(input, W, H);

  const soft = base.clone().blur(5).opacity(0.24);
  base.composite(soft, 0, 0);

  base.color([
    { apply: 'brighten', params: [8] },
    { apply: 'saturate', params: [10] },
    { apply: 'red', params: [8] }
  ]);

  base.contrast(0.08);

  try {
    base.convolute([
      [0, -1, 0],
      [-1, 5, -1],
      [0, -1, 0]
    ]);
  } catch {}

  addSoftLight(base, 0.20);
  applyVignette(base, 0.14);

  drawRect(base, 0, H - 120, W, 120, rgba(255, 255, 255, 255), 0.08);

  return base.quality(93);
}

async function applyFilter(command, image) {
  switch (command) {
    case 'wanted':
      return await makeWanted(image);

    case 'jail':
      return await makeJail(image);

    case 'triggered':
      return await makeTriggered(image);

    case 'lgbt':
      return await makeLGBT(image);

    case 'glitch':
      return await makeGlitch(image);

    case 'distorsion':
      return await makeDistorsion(image);

    case 'basura':
      return await makeBasura(image);

    case 'payaso':
      return await makePayaso(image);

    case 'bonito':
      return await makeBonito(image);

    default:
      return null;
  }
}

module.exports = {
  commands: CMDS,

  async execute({ sock, msg, remoteJid, command }) {
    try {
      const image = await readInputImage(msg);

      if (!image) {
        return sock.sendMessage(remoteJid, {
          text:
`❌ Responde a una *imagen*, *sticker* o *documento de imagen*.

Comandos disponibles:
.wanted
.jail
.triggered
.lgbt
.glitch
.distorsion
.basura
.payaso
.bonito`
        }, { quoted: msg });
      }

      const result = await applyFilter(String(command).toLowerCase(), image);

      if (!result) {
        return sock.sendMessage(remoteJid, {
          text: '❌ No se pudo aplicar el filtro.'
        }, { quoted: msg });
      }

      const buffer = await result.getBufferAsync(Jimp.MIME_JPEG);

      await sock.sendMessage(remoteJid, {
        image: buffer,
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
