'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const yts = require('yt-search');

const db = require('../lib/database');
const config = require('../config');

const spotifySelections = new Map();

const RESULTS_PER_PAGE = 5;

function cleanNumber(jid = '') {
  return String(jid)
    .split('@')[0]
    .split(':')[0]
    .replace(/\D/g, '');
}

function sanitizeFileName(name = 'audio') {
  return String(name)
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'audio';
}

function formatDuration(seconds = 0) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;

  return `${m}:${String(s).padStart(2, '0')}`;
}

async function isPremiumOrOwner(sender) {
  try {
    const senderNumber = cleanNumber(sender);

    const ownerNumbers = Array.isArray(config.owner)
      ? config.owner.map(v => String(v).replace(/\D/g, ''))
      : [];

    if (ownerNumbers.includes(senderNumber)) {
      return true;
    }

    const user1 = await db.getUser(sender);
    const user2 = await db.getUser(senderNumber);

    return (
      user1?.premium === true ||
      user2?.premium === true ||
      user1?.isPremium === true ||
      user2?.isPremium === true ||
      Number(user1?.premiumUntil || 0) > Date.now() ||
      Number(user2?.premiumUntil || 0) > Date.now()
    );

  } catch {
    return false;
  }
}

async function searchVideos(query) {
  const result = await yts(query);

  if (!result?.videos?.length) {
    return [];
  }

  return result.videos
    .filter(v => v.url)
    .slice(0, 50);
}

function buildResultsMessage(query, videos, page = 0) {
  const start = page * RESULTS_PER_PAGE;
  const end = start + RESULTS_PER_PAGE;

  const chunk = videos.slice(start, end);

  let text =
`🎵 *Resultados encontrados*

🔎 Búsqueda:
${query}

━━━━━━━━━━━━━━━

`;

  chunk.forEach((video, index) => {
    const num = index + 1;

    text +=
`${num}. ${video.title}
⏱️ ${video.timestamp}
👤 ${video.author?.name || 'Desconocido'}

`;
  });

  text +=
`━━━━━━━━━━━━━━━

💬 Responde a este mensaje con:

1
2
3
4
5

➡️ O escribe:
*siguiente*

📄 Página ${page + 1}/${Math.ceil(videos.length / RESULTS_PER_PAGE)}`;

  return text;
}
async function downloadAndSend(sock, remoteJid, msg, video) {
  try {
    const id = Date.now();

    const output = path.join(
      TEMP_DIR,
      `spotify2_${id}.%(ext)s`
    );

    await execFileAsync('yt-dlp', [
      '--extractor-args', 'youtube:player_client=android',
      '--geo-bypass',
      '--force-ipv4',
      '--no-playlist',
      '--ignore-errors',
      '--no-warnings',
      '-f', 'ba/b',
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '320K',
      '-o', output,
      video.url
    ]);

    const file = fs.readdirSync(TEMP_DIR).find(f =>
      f.startsWith(`spotify2_${id}`) &&
      f.endsWith('.mp3')
    );

    if (!file) {
      return sock.sendMessage(
        remoteJid,
        { text: '❌ No se pudo descargar el audio.' },
        { quoted: msg }
      );
    }

    const filePath = path.join(TEMP_DIR, file);

    await sock.sendMessage(
      remoteJid,
      {
        text:
`🎧 Descargando:

🎶 ${video.title}
⏱️ ${video.timestamp || 'Desconocido'}`
      },
      { quoted: msg }
    );

    await sock.sendMessage(
      remoteJid,
      {
        audio: fs.readFileSync(filePath),
        mimetype: 'audio/mpeg',
        fileName: `${video.title}.mp3`,
        ptt: false
      },
      { quoted: msg }
    );

    try {
      fs.unlinkSync(filePath);
    } catch {}
  } catch (e) {
    console.log('spotify2 error:', e);

    await sock.sendMessage(
      remoteJid,
      {
        text: '❌ Error descargando la canción.'
      },
      { quoted: msg }
    );
  }
}

module.exports = {
  commands: ['spotify2'],

  async execute({
    sock,
    remoteJid,
    args,
    msg,
    sender
  }) {

    const query = args.join(' ').trim();

    if (!query) {
      return sock.sendMessage(
        remoteJid,
        {
          text:
`❌ Uso correcto:

.spotify2 bad bunny dakiti`
        },
        { quoted: msg }
      );
    }

    const search = await yts(query);

    const videos = (search.videos || [])
      .filter(v => v.url)
      .slice(0, 5);

    if (!videos.length) {
      return sock.sendMessage(
        remoteJid,
        {
          text: '❌ No encontré resultados.'
        },
        { quoted: msg }
      );
    }

    pendingSelections.set(sender, {
      page: 0,
      query,
      results: search.videos
    });

    let text =
`🎧 *Resultados encontrados*

Responde a ESTE mensaje con:

1
2
3
4
5

o escribe:

*siguiente*

━━━━━━━━━━━━━━\n`;

    videos.forEach((v, i) => {
      text +=
`${i + 1}. ${v.title}
⏱️ ${v.timestamp || 'Desconocido'}

`;
    });

    const sent = await sock.sendMessage(
      remoteJid,
      { text },
      { quoted: msg }
    );

    selectionMessages.set(sent.key.id, sender);
  },

  async onMessage({
    sock,
    msg,
    sender,
    body,
    remoteJid
  }) {

    if (!body) return;

    const replyId =
      msg.message?.extendedTextMessage?.contextInfo?.stanzaId;

    if (!replyId) return;

    if (!selectionMessages.has(replyId)) return;

    const owner = selectionMessages.get(replyId);

    if (owner !== sender) return;

    const data = pendingSelections.get(sender);

    if (!data) return;

    const text = body.toLowerCase().trim();

    if (text === 'siguiente') {

      data.page++;

      const start = data.page * 5;

      const videos = data.results.slice(
        start,
        start + 5
      );

      if (!videos.length) {
        return sock.sendMessage(
          remoteJid,
          {
            text: '❌ No hay más resultados.'
          },
          { quoted: msg }
        );
      }

      let message =
`🎧 *Más resultados*

Responde con:

1
2
3
4
5

o *siguiente*

━━━━━━━━━━━━━━\n`;

      videos.forEach((v, i) => {
        message +=
`${i + 1}. ${v.title}
⏱️ ${v.timestamp || 'Desconocido'}

`;
      });

      const sent = await sock.sendMessage(
        remoteJid,
        { text: message },
        { quoted: msg }
      );

      selectionMessages.set(
        sent.key.id,
        sender
      );

      return;
    }

    const number = parseInt(text);

    if (
      isNaN(number) ||
      number < 1 ||
      number > 5
    ) return;

    const index =
      (data.page * 5) + (number - 1);

    const video = data.results[index];

    if (!video) return;

    pendingSelections.delete(sender);

    await downloadAndSend(
      sock,
      remoteJid,
      msg,
      video
    );
  }
};
