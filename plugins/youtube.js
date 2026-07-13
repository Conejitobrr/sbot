'use strict';

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const yts = require('yt-search');

const execFileAsync = promisify(execFile);
const TEMP_DIR = path.join(process.cwd(), 'temp');

// ⏳ COLA POR CHAT: 1 canción cada 2 minutos
const QUEUE_DELAY = 2 * 60 * 1000;
const queues = new Map();
const processingChats = new Set();

// 🔥 NUEVO: Para controlar a quiénes ya se les avisó que la cola está llena
const warnedChats = new Map(); 

function ensureTemp() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

function isYouTubeUrl(text = '') {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(text);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
  // 🔥 CAMBIO APLICADO: Ruta absoluta para leer las cookies
  const cookiesPath = path.join(process.cwd(), 'youtube.com_cookies.txt');

  await execFileAsync('yt-dlp', [
    '--extractor-args', 'youtube:player_client=android',
    '--geo-bypass',
    '--no-playlist',
    '--ignore-errors',
    '--no-warnings',
    
    // 🔥 CAMBIO APLICADO: Forzamos el disfraz de humano con el archivo
    '--cookies', cookiesPath,

    '-f', 'ba/b',

    '-x',
    '--audio-format', 'mp3',
    '--audio-quality', '320K',

    '-o', output,
    url
  ]);
}

function sanitizeFileName(name = 'audio') {
  return String(name)
    .replace(/[\\/:*?"<>|]/g, '')
    .slice(0, 80)
    .trim() || 'audio';
}

async function processQueue(chatId) {
  if (processingChats.has(chatId)) return;

  processingChats.add(chatId);

  const queue = queues.get(chatId) || [];

  while (queue.length > 0) {
    const job = queue.shift();

    try {
      await handleDownload(job);

    } catch (err) {
      console.log('❌ Error en cola youtube/play:', err?.message || err);

      await job.sock.sendMessage(job.remoteJid, {
        text: '❌ Error al procesar esta canción.'
      }, { quoted: job.msg });
    }

    // 🔥 Una canción ha terminado (con éxito o error).
    // Se ha liberado un cupo, así que reseteamos las advertencias de este chat
    // para que la gente pueda volver a pedir su canción sin ser ignorada.
    warnedChats.delete(chatId);

    if (queue.length > 0) {
      await sleep(QUEUE_DELAY);
    }
  }

  queues.delete(chatId);
  processingChats.delete(chatId);
  warnedChats.delete(chatId);
}

async function handleDownload(job) {
  const { sock, remoteJid, msg, query } = job;

  let file = null;
  let finalPath = null;

  try {
    ensureTemp();

    let url = query;
    let title = 'Audio de YouTube';

    if (!isYouTubeUrl(query)) {
      const video = await searchYouTube(query);

      if (!video) {
        return sock.sendMessage(remoteJid, {
          text: '❌ No se encontraron resultados.'
        }, { quoted: msg });
      }

      url = video.url;
      title = video.title || title;
    }

    const id = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;

    file = path.join(
      TEMP_DIR,
      `yt_audio_${id}.%(ext)s`
    );

    await downloadAudio(url, file);

    const files = fs.readdirSync(TEMP_DIR);

    const downloaded = files.find(f =>
      f.startsWith(`yt_audio_${id}`) &&
      f.endsWith('.mp3')
    );

    if (!downloaded) {
      return sock.sendMessage(remoteJid, {
        text: '❌ No se pudo descargar el audio.'
      }, { quoted: msg });
    }

    finalPath = path.join(TEMP_DIR, downloaded);

    const sizeMB = fs.statSync(finalPath).size / 1024 / 1024;

    if (sizeMB > 95) {
      return sock.sendMessage(remoteJid, {
        text: '❌ El audio pesa demasiado para enviarlo por WhatsApp.'
      }, { quoted: msg });
    }

    await sock.sendMessage(remoteJid, {
      audio: fs.readFileSync(finalPath),
      mimetype: 'audio/mpeg',
      fileName: `${sanitizeFileName(title)}.mp3`
    }, { quoted: msg });

  } finally {
    try {
      if (finalPath && fs.existsSync(finalPath)) fs.unlinkSync(finalPath);
    } catch {}
  }
}

module.exports = {
  commands: ['yt', 'play', 'youtube'],

  async execute({ sock, remoteJid, args, msg, sender, pushName }) {
    try {
      if (!args.length) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Envía un link o nombre de canción.\n\nEjemplo:\n.play bad bunny'
        }, { quoted: msg });
      }

      const query = args.join(' ').trim();

      if (!queues.has(remoteJid)) {
        queues.set(remoteJid, []);
      }

      const queue = queues.get(remoteJid);
      const isProcessing = processingChats.has(remoteJid);
      
      // La cantidad real de canciones es: (lo que está en espera) + (la que se está bajando ahorita)
      const activeCount = queue.length + (isProcessing ? 1 : 0);

      // 🔥 LÓGICA DE TOPE (MÁXIMO 2)
      if (activeCount >= 2) {
        if (!warnedChats.has(remoteJid)) {
          warnedChats.set(remoteJid, new Set());
        }
        
        const warnedUsers = warnedChats.get(remoteJid);

        // Si ya advertimos a este usuario, lo ignoramos en completo silencio
        if (warnedUsers.has(sender)) {
          return; 
        }

        // Si es su primer intento estando llena la cola, le avisamos y lo marcamos
        warnedUsers.add(sender);
        return sock.sendMessage(remoteJid, {
          text: `⚠️ *COLA LLENA*\n\n@${sender.split('@')[0]}, ya hay 2 canciones procesándose o en espera en este chat. Por favor, espera un momento a que se libere un espacio para pedir más.`,
          mentions: [sender]
        }, { quoted: msg });
      }

      const position = queue.length + (isProcessing ? 1 : 0);
      const waitMin = position === 0 ? 0 : position * 2;

      queue.push({
        sock,
        remoteJid,
        args,
        msg,
        sender,
        pushName: pushName || 'Usuario',
        query
      });

      await sock.sendMessage(remoteJid, {
        text:
position === 0
? `📥 *Canción añadida a la cola*

👤 Pedido por: @${sender.split('@')[0]}
🎶 Búsqueda: *${query}*

⏳ Tu canción se procesará automáticamente.`
: `📥 *Canción añadida a la cola*

👤 Pedido por: @${sender.split('@')[0]}
🎶 Búsqueda: *${query}*
📌 Posición en cola: *#${position + 1}*

⏳ Tu pedido se cargará automáticamente en *${waitMin} minuto(s)*.
🚫 No necesitas volver a usar el comando.`,
        mentions: [sender]
      }, { quoted: msg });

      processQueue(remoteJid);

    } catch (err) {
      console.log('❌ Error en youtube/play:', err?.message || err);

      await sock.sendMessage(remoteJid, {
        text:
`❌ Error al descargar audio.

📌 Prueba otra canción o link.
📌 Verifica yt-dlp y ffmpeg.`
      }, { quoted: msg });
    }
  }
};
