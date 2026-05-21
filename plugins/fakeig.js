'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const TEMP_DIR = path.join(process.cwd(), 'temp');
const NICKS_PATH = path.join(process.cwd(), 'lib', 'fakeig_nicks.json');

function ensureDir(file) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function ensureTemp() {
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
}

function ensureNickDB() {
  ensureDir(NICKS_PATH);
  if (!fs.existsSync(NICKS_PATH)) {
    fs.writeFileSync(NICKS_PATH, JSON.stringify({}, null, 2));
  }
}

function loadNicks() {
  ensureNickDB();
  try {
    return JSON.parse(fs.readFileSync(NICKS_PATH, 'utf8') || '{}');
  } catch {
    return {};
  }
}

function saveNicks(data) {
  ensureNickDB();
  fs.writeFileSync(NICKS_PATH, JSON.stringify(data, null, 2));
}

function cleanJid(jid = '') {
  return String(jid).split(':')[0];
}

function cleanNick(name = '') {
  return String(name || '')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24) || 'usuario';
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

function saveNick(jid, name) {
  jid = cleanJid(jid);
  name = cleanNick(name);

  if (!jid || !name || name === 'usuario' || name === 'Sin nombre') return;

  const data = loadNicks();

  data[jid] = {
    name,
    updatedAt: Date.now()
  };

  saveNicks(data);
}

async function getNick(sock, store, groupMetadata, jid) {
  jid = cleanJid(jid);

  const saved = loadNicks();
  if (saved[jid]?.name) return cleanNick(saved[jid].name);

  const contact =
    store?.contacts?.[jid] ||
    sock?.contacts?.[jid] ||
    {};

  const participant = groupMetadata?.participants?.find(p =>
    cleanJid(p.id) === jid ||
    cleanJid(p.jid) === jid ||
    cleanJid(p.lid) === jid ||
    cleanJid(p.participant) === jid
  ) || {};

  const nick = cleanNick(
    contact.name ||
    contact.notify ||
    contact.verifiedName ||
    contact.pushName ||
    participant.name ||
    participant.notify ||
    participant.verifiedName ||
    participant.pushName ||
    'usuario'
  );

  if (nick !== 'usuario') saveNick(jid, nick);

  return nick;
}

function parseFakeIgText(body = '') {
  let text = String(body)
    .replace(/^[\s./#!]*(fakeig|igcoment)\s*/i, '')
    .trim();

  text = text.replace(/@\S+\s*/g, '').trim();

  const parts = text.split('|').map(v => v.trim()).filter(Boolean);

  if (parts.length >= 2) {
    return {
      customNick: cleanNick(parts[0]),
      comment: parts.slice(1).join(' | ').trim()
    };
  }

  return {
    customNick: '',
    comment: text.trim()
  };
}

function parseSetNickText(body = '') {
  return String(body)
    .replace(/^[\s./#!]*(setfakeig|setnickig)\s*/i, '')
    .replace(/@\S+\s*/g, '')
    .trim();
}

function wrapText(text = '', max = 34) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';

  for (const word of words) {
    const test = `${line} ${word}`.trim();

    if (test.length > max && line) {
      lines.push(line.trim());
      line = word;
    } else {
      line = test;
    }
  }

  if (line.trim()) lines.push(line.trim());

  return lines;
}

function randomLikes() {
  const n = Math.random();

  if (n < 0.45) return `${(Math.random() * 8.3 + 1.7).toFixed(1)}k`;
  if (n < 0.85) return `${Math.floor(Math.random() * 900 + 100)}k`;

  return `${(Math.random() * 4 + 1).toFixed(1)}M`;
}

async function convertSvgToPng(svgPath, pngPath) {
  try {
    await execFileAsync('magick', [svgPath, pngPath]);
  } catch {
    await execFileAsync('convert', [svgPath, pngPath]);
  }
}

async function downloadAvatar(sock, jid, filePath) {
  let pfp;

  try {
    pfp = await sock.profilePictureUrl(jid, 'image');
  } catch {
    pfp = 'https://i.imgur.com/JP3QZ7B.jpeg';
  }

  const avatarRes = await axios.get(pfp, {
    responseType: 'arraybuffer'
  });

  fs.writeFileSync(filePath, avatarRes.data);
}

module.exports = {
  commands: ['fakeig', 'igcoment', 'setfakeig', 'setnickig'],

  async onMessage({ sender, pushName, store }) {
    try {
      if (sender && pushName) {
        saveNick(sender, pushName);

        if (store) {
          if (!store.contacts) store.contacts = {};

          store.contacts[sender] = {
            ...(store.contacts[sender] || {}),
            id: sender,
            name: pushName,
            notify: pushName,
            pushName
          };
        }
      }
    } catch {}
  },

  async execute({ sock, remoteJid, msg, store, groupMetadata, command }) {
    let avatarPath = null;
    let svgPath = null;
    let pngPath = null;

    try {
      const mentioned = cleanJid(getMentioned(msg)[0]);

      if (!mentioned) {
        return sock.sendMessage(remoteJid, {
          text:
`❌ Menciona a alguien.

Ejemplos:
.fakeig @usuario texto
.fakeig @usuario | Nick personalizado | texto
.setfakeig @usuario Nick personalizado`
        }, { quoted: msg });
      }

      const body = getText(msg);

      if (command === 'setfakeig' || command === 'setnickig') {
        const nick = parseSetNickText(body);

        if (!nick) {
          return sock.sendMessage(remoteJid, {
            text:
`❌ Escribe el nick.

Ejemplo:
.setfakeig @usuario Aramis`
          }, { quoted: msg });
        }

        saveNick(mentioned, nick);

        return sock.sendMessage(remoteJid, {
          text: `✅ Nick guardado correctamente: *${cleanNick(nick)}*`
        }, { quoted: msg });
      }

      const parsed = parseFakeIgText(body);
      const comment = parsed.comment;

      if (!comment) {
        return sock.sendMessage(remoteJid, {
          text:
`❌ Escribe el comentario.

Ejemplo:
.fakeig @usuario qué hermosa foto 😻`
        }, { quoted: msg });
      }

      if (parsed.customNick) {
        saveNick(mentioned, parsed.customNick);
      }

      ensureTemp();

      const id = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;

      avatarPath = path.join(TEMP_DIR, `fakeig_avatar_${id}.jpg`);
      svgPath = path.join(TEMP_DIR, `fakeig_${id}.svg`);
      pngPath = path.join(TEMP_DIR, `fakeig_${id}.png`);

      await downloadAvatar(sock, mentioned, avatarPath);

      const avatarBase64 = fs.readFileSync(avatarPath).toString('base64');

      const username =
        parsed.customNick ||
        await getNick(sock, store, groupMetadata, mentioned);

      const lines = wrapText(comment, 34);
      const likes = randomLikes();

      const lineHeight = 58;
      const baseHeight = 245;
      const extraHeight = Math.max(0, lines.length - 1) * lineHeight;
      const height = baseHeight + extraHeight;

      const commentLines = lines.map((line, i) => {
        return `<text x="170" y="${125 + i * lineHeight}" font-size="43" fill="#f1f1f1" font-family="Arial, sans-serif">${escapeXml(line)}</text>`;
      }).join('\n');

      const timeX = Math.min(760, 185 + username.length * 25);

      const svg =
`<svg width="1080" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="1080" height="${height}" fill="#11181c"/>

  <defs>
    <clipPath id="avatarClip">
      <circle cx="78" cy="78" r="62"/>
    </clipPath>
  </defs>

  <image href="data:image/jpeg;base64,${avatarBase64}" x="16" y="16" width="124" height="124" clip-path="url(#avatarClip)" preserveAspectRatio="xMidYMid slice"/>

  <text x="170" y="58" font-size="43" font-weight="700" fill="#f5f5f5" font-family="Arial, sans-serif">${escapeXml(username)}</text>
  <text x="${timeX}" y="58" font-size="42" fill="#9da3a8" font-family="Arial, sans-serif">1 min</text>

  ${commentLines}

  <text x="170" y="${height - 35}" font-size="39" font-weight="700" fill="#aeb4b8" font-family="Arial, sans-serif">Responder</text>

  <text x="980" y="105" font-size="70" fill="none" stroke="#d5d5d5" stroke-width="4" font-family="Arial, sans-serif">♡</text>
  <text x="970" y="174" font-size="38" fill="#aeb4b8" font-family="Arial, sans-serif" text-anchor="middle">${escapeXml(likes)}</text>
</svg>`;

      fs.writeFileSync(svgPath, svg);

      await convertSvgToPng(svgPath, pngPath);

      await sock.sendMessage(remoteJid, {
        image: fs.readFileSync(pngPath),
        caption: '📸 Comentario falso'
      }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error fakeig:', err?.message || err);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error creando comentario falso. Verifica que tengas instalado imagemagick.'
      }, { quoted: msg });

    } finally {
      for (const file of [avatarPath, svgPath, pngPath]) {
        try {
          if (file && fs.existsSync(file)) fs.unlinkSync(file);
        } catch {}
      }
    }
  }
};
