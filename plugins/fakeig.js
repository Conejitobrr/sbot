'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);
const TEMP_DIR = path.join(process.cwd(), 'temp');

function ensureTemp() {
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
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

function escapeXml(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapText(text = '', max = 38) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';

  for (const word of words) {
    if ((line + ' ' + word).trim().length > max) {
      lines.push(line.trim());
      line = word;
    } else {
      line += ' ' + word;
    }
  }

  if (line.trim()) lines.push(line.trim());

  return lines.slice(0, 4);
}

async function convertSvgToPng(svgPath, pngPath) {
  try {
    await execFileAsync('magick', [svgPath, pngPath]);
  } catch {
    await execFileAsync('convert', [svgPath, pngPath]);
  }
}

module.exports = {
  commands: ['fakeig', 'igcoment'],

  async execute({ sock, remoteJid, msg }) {
    let svgPath = null;
    let pngPath = null;

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
          text: '❌ Escribe el comentario.'
        }, { quoted: msg });
      }

      ensureTemp();

      let pfp;

      try {
        pfp = await sock.profilePictureUrl(mentioned, 'image');
      } catch {
        pfp = 'https://i.imgur.com/JP3QZ7B.jpeg';
      }

      const avatarRes = await axios.get(pfp, {
        responseType: 'arraybuffer'
      });

      const avatarBase64 = Buffer.from(avatarRes.data).toString('base64');

      const username = mentioned
        .split('@')[0]
        .replace(/\D/g, '');

      const lines = wrapText(comment);

      const textLines = lines.map((line, i) => {
        return `<text x="180" y="${130 + i * 42}" font-size="34" fill="#111">${escapeXml(line)}</text>`;
      }).join('\n');

      const height = Math.max(260, 190 + lines.length * 42);

      const svg =
`<svg width="1080" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="1080" height="${height}" fill="#ffffff"/>

  <defs>
    <clipPath id="avatarClip">
      <circle cx="90" cy="90" r="55"/>
    </clipPath>
  </defs>

  <image href="data:image/jpeg;base64,${avatarBase64}" x="35" y="35" width="110" height="110" clip-path="url(#avatarClip)" preserveAspectRatio="xMidYMid slice"/>

  <text x="180" y="75" font-size="38" font-weight="700" fill="#000">${escapeXml(username)}</text>

  ${textLines}

  <text x="180" y="${height - 40}" font-size="28" fill="#8e8e8e">Hace 1 min</text>
</svg>`;

      const id = Date.now();

      svgPath = path.join(TEMP_DIR, `fakeig_${id}.svg`);
      pngPath = path.join(TEMP_DIR, `fakeig_${id}.png`);

      fs.writeFileSync(svgPath, svg);

      await convertSvgToPng(svgPath, pngPath);

      await sock.sendMessage(remoteJid, {
        image: fs.readFileSync(pngPath),
        caption: '📸 Comentario falso de Instagram'
      }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error fakeig:', err?.message || err);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error creando comentario falso. Verifica que tengas instalado imagemagick.'
      }, { quoted: msg });

    } finally {
      for (const file of [svgPath, pngPath]) {
        try {
          if (file && fs.existsSync(file)) fs.unlinkSync(file);
        } catch {}
      }
    }
  }
};
