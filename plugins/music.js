'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execFile } = require('child_process');
const { promisify } = require('util');
const yts = require('yt-search');
const db = require('../lib/database');

const execFileAsync = promisify(execFile);
const TEMP_DIR = path.join(process.cwd(), 'temp');

const queue = [];
let processingQueue = false;

// 🎵 límite normal
const FREE_LIMIT = 3;
const userUses = new Map();

// ⏳ cola entre 1 y 2 minutos
const MIN_DELAY = 60 * 1000;
const MAX_DELAY = 2 * 60 * 1000;

// ⏱️ máximo 10 minutos
const MAX_DURATION_SECONDS = 10 * 60;

function ensureTemp() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay() {
  return Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY + 1)) + MIN_DELAY;
}

function cleanNumber(jid = '') {
  return String(jid).split('@')[0].split(':')[0].replace(/\D/g, '');
}

function isYouTubeUrl(text = '') {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(text);
}

function sanitizeFileName(name = 'audio') {
  return String(name)
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'audio';
}

function parseDurationSeconds(timestamp = '') {
  const parts = String(timestamp).split(':').map(n => Number(n));

  if (parts.some(isNaN)) return 0;

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  return parts[0] || 0;
}

function getTodayKey(sender) {
  const d = new Date();
  return `${cleanNumber(sender)}-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

async function isPremiumUser(sender) {
  try {
    const user = await db.getUser(sender);
    const clean = await db.getUser(cleanNumber(sender));

    return (
      user?.premium === true ||
      clean?.premium === true ||
      user?.isPremium === true ||
      clean?.isPremium === true ||
      Number(user?.premiumUntil || 0) > Date.now() ||
      Number(clean?.premiumUntil || 0) > Date.now()
    );
  } catch {
    return false;
  }
}

function useFreeRequest(sender) {
  const key = getTodayKey(sender);
  const used = userUses.get(key) || 0;

  if (used >= FREE_LIMIT) {
    return {
      allowed: false,
      remaining: 0
    };
  }

  const next = used + 1;
  userUses.set(key, next);

  return {
    allowed: true,
    remaining: FREE_LIMIT - next
  };
}

async function searchYouTube(query) {
  const res = await yts(query);

  if (!res.videos?.length) return null;

  return (
    res.videos.find(v =>
      v.url &&
      !v.title?.toLowerCase().includes('mix') &&
      !v.title?.toLowerCase().includes('playlist')
    ) || res.videos[0]
  );
}

async function downloadAudio(url, output) {
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
    url
  ]);
}

async function processQueue() {
  if (processingQueue) return;

  processingQueue = true;

  while (queue.length > 0) {
    const job = queue.shift();

    try {
      await job.sock.sendMessage(job.remoteJid, {
        text:
`🎧 *Turno de música*

👤 Pedido por: @${job.sender.split('@')[0]}
🔍 Búsqueda: *${job.query}*

⏳ Preparando descarga...`,
        mentions: [job.sender]
      }, { quoted: job.msg });

      await handleDownload(job);

    } catch (err) {
      console.log('❌ Error en music queue:', err?.message || err);

      await job.sock.sendMessage(job.remoteJid, {
        text: '❌ Error al procesar esta canción.'
      }, { quoted: job.msg });
    }

    if (queue.length > 0) {
      await sleep(randomDelay());
    }
  }

  processingQueue = false;
}

async function handleDownload(job) {
  const { sock, remoteJid, msg, query } = job;

  let downloadedPath = null;
  let finalAudio = null;
  let thumbPath = null;

  try {
    ensureTemp();

    let url = query;
    let video = null;

    if (!isYouTubeUrl(query)) {
      await sock.sendMessage(remoteJid, {
        text: '🔍 Buscando canción...'
      }, { quoted: msg });

      video = await searchYouTube(query);

      if (!video) {
        return sock.sendMessage(remoteJid, {
          text: '❌ No se encontraron resultados.'
        }, { quoted: msg });
      }

      url = video.url;
    } else {
      video = await searchYouTube(query);
    }

    if (!video) {
      return sock.sendMessage(remoteJid, {
        text: '❌ No se pudo obtener información de la canción.'
      }, { quoted: msg });
    }

    const seconds = parseDurationSeconds(video.timestamp);

    if (seconds > MAX_DURATION_SECONDS) {
      return sock.sendMessage(remoteJid, {
        text:
`❌ La canción es muy larga.

⏱️ Duración: ${video.timestamp}
📌 Máximo permitido: 10 minutos`
      }, { quoted: msg });
    }

    const title = sanitizeFileName(video.title || 'Audio');
    const artist = sanitizeFileName(video.author?.name || 'Desconocido');
    const duration = video.timestamp || 'Desconocido';

    await sock.sendMessage(remoteJid, {
      text:
`🎵 *Descargando música*

🎶 ${title}
👤 ${artist}
⏱️ ${duration}
💿 MP3 320K

⏳ Preparando audio con carátula...`
    }, { quoted: msg });

    const id = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;
    const rawOutput = path.join(TEMP_DIR, `music_${id}.%(ext)s`);

    await downloadAudio(url, rawOutput);

    const downloaded = fs.readdirSync(TEMP_DIR).find(f =>
      f.startsWith(`music_${id}`) && f.endsWith('.mp3')
    );

    if (!downloaded) {
      return sock.sendMessage(remoteJid, {
        text: '❌ No se pudo descargar el audio.'
      }, { quoted: msg });
    }

    downloadedPath = path.join(TEMP_DIR, downloaded);

    thumbPath = path.join(TEMP_DIR, `thumb_${id}.jpg`);

    const thumbUrl =
      video.thumbnail ||
      video.image ||
      `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;

    const response = await axios.get(thumbUrl, {
      responseType: 'arraybuffer'
    });

    fs.writeFileSync(thumbPath, response.data);

    finalAudio = path.join(TEMP_DIR, `${title}_${id}.mp3`);

    await execFileAsync('ffmpeg', [
      '-i', downloadedPath,
      '-i', thumbPath,

      '-map', '0',
      '-map', '1',

      '-c', 'copy',
      '-id3v2_version', '3',

      '-metadata', `title=${title}`,
      '-metadata', `artist=${artist}`,
      '-metadata', 'album=SiriusBot Music',

      '-disposition:v', 'attached_pic',
      '-y',

      finalAudio
    ]);

    const sizeMB = fs.statSync(finalAudio).size / 1024 / 1024;

    if (sizeMB > 95) {
      return sock.sendMessage(remoteJid, {
        text: '❌ El audio pesa demasiado para enviarlo.'
      }, { quoted: msg });
    }

    const thumbBuffer = fs.readFileSync(thumbPath);

    await sock.sendMessage(remoteJid, {
      image: thumbBuffer,
      caption:
`🎧 *Sirius Music*

🎶 *${title}*
👤 ${artist}
⏱️ ${duration}
💿 MP3 320K`
    }, { quoted: msg });

    await sock.sendMessage(remoteJid, {
      audio: fs.readFileSync(finalAudio),
      mimetype: 'audio/mpeg',
      fileName: `${title}.mp3`,
      ptt: false
    }, { quoted: msg });

  } finally {
    for (const file of [downloadedPath, finalAudio, thumbPath]) {
      try {
        if (file && fs.existsSync(file)) fs.unlinkSync(file);
      } catch {}
    }
  }
}

module.exports = {
  commands: ['music', 'song', 'mp3'],

  async execute({ sock, remoteJid, args, msg, sender }) {
    try {
      if (!args.length) {
        return sock.sendMessage(remoteJid, {
          text:
`❌ Ingresa una canción.

Ejemplo:
.music bad bunny dakiti`
        }, { quoted: msg });
      }

      const query = args.join(' ').trim();
      const premium = await isPremiumUser(sender);

      let remaining = '∞';

      if (!premium) {
        const limit = useFreeRequest(sender);

        if (!limit.allowed) {
          return sock.sendMessage(remoteJid, {
            text:
`❌ Alcanzaste tu límite de música por hoy.

🎧 Límite normal: ${FREE_LIMIT} canciones por día
👑 Premium: ilimitado`
          }, { quoted: msg });
        }

        remaining = limit.remaining;
      }

      const position = queue.length + (processingQueue ? 1 : 0);
      const waitMin = position === 0 ? 0 : position;

      queue.push({
        sock,
        remoteJid,
        msg,
        sender,
        query
      });

      await sock.sendMessage(remoteJid, {
        text:
position === 0
? `📥 *Pedido añadido*

👤 Pedido por: @${sender.split('@')[0]}
🎶 Canción: *${query}*
🎧 Pedidos restantes: *${remaining}*

⏳ Tu música se está procesando automáticamente...`
: `📥 *Pedido añadido a la cola*

👤 Pedido por: @${sender.split('@')[0]}
🎶 Canción: *${query}*
📌 Posición: *#${position + 1}*
🎧 Pedidos restantes: *${remaining}*

⏳ Tu pedido se cargará automáticamente en *${waitMin}-${waitMin + 1} minuto(s)*.
🚫 Solo espera, no necesitas volver a usar el comando.`,
        mentions: [sender]
      }, { quoted: msg });

      processQueue();

    } catch (err) {
      console.log('❌ Error en music/song:', err?.message || err);

      await sock.sendMessage(remoteJid, {
        text:
`❌ Error al descargar música.

📌 Verifica:
• yt-dlp
• ffmpeg
• internet`
      }, { quoted: msg });
    }
  }
};
