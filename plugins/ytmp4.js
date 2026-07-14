'use strict';

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const yts = require('yt-search');
const db = require('../lib/database');

let events = null;
try {
  events = require('../lib/events');
} catch {}

const execFileAsync = promisify(execFile);
const TEMP_DIR = path.join(process.cwd(), 'temp');

// ⏳ COLA POR CHAT: 1 video cada 2 minutos
const QUEUE_DELAY = 2 * 60 * 1000; 
const queues = new Map();
const processingChats = new Set();
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

async function searchVideo(query) {
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

// 🔥 DESCARGA CON EL VPN INYECTADO
async function downloadVideo(url, output) {
  await execFileAsync('yt-dlp', [
    // Usamos el túnel VPN que ya tienes encendido en el puerto 40000
    '--proxy', 'socks5://127.0.0.1:40000', 
    
    '--geo-bypass',
    '--no-playlist',
    '--ignore-errors',
    '--no-warnings',

    // Buscamos un video ligero y decente para WhatsApp
    '-f', 'bv*[height<=480]+ba/best[height<=480]/best[height<=480]/best',
    '--merge-output-format', 'mp4',

    '-o', output,
    url
  ]);
}

// 🔥 CONVERSIÓN BLINDADA PARA PROTEGER TU JUEGO
async function convertVideo(input, output) {
  await execFileAsync('ffmpeg', [
    '-y',
    '-i', input,
    
    // TRUCO EXPERTO: Obligamos a ffmpeg a usar solo 1 núcleo de tus 4.
    // Así tu juego no sentirá absolutamente nada de lag.
    '-threads', '1', 
    
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-preset', 'fast',
    '-crf', '28',
    output
  ]);
}

// ==========================================
// 🛠️ SISTEMA DE COLA (QUEUE)
// ==========================================
async function processQueue(chatId) {
  if (processingChats.has(chatId)) return;
  processingChats.add(chatId);

  const queue = queues.get(chatId) || [];

  while (queue.length > 0) {
    const job = queue.shift();

    try {
      await handleDownload(job);
    } catch (err) {
      console.log('❌ Error en cola ytmp4:', err?.message || err);
      await job.sock.sendMessage(job.remoteJid, {
        text: '❌ Error al procesar este video.'
      }, { quoted: job.msg });
    }

    warnedChats.delete(chatId);

    if (queue.length > 0) {
      await sleep(QUEUE_DELAY);
    }
  }

  queues.delete(chatId);
  processingChats.delete(chatId);
  warnedChats.delete(chatId);
}

// ==========================================
// 📥 LÓGICA DE DESCARGA PRINCIPAL
// ==========================================
async function handleDownload(job) {
  const { sock, remoteJid, msg, sender, query } = job;
  let downloadedPath = null;
  let finalFile = null;

  try {
    ensureTemp();
    let url = query;
    let title = 'Video de YouTube';
    let duration = '';

    if (!isYouTubeUrl(query)) {
      await sock.sendMessage(remoteJid, {
        text: '🔍 Buscando video...'
      }, { quoted: msg });

      const video = await searchVideo(query);

      if (!video) {
        return sock.sendMessage(remoteJid, {
          text: '❌ No se encontraron resultados.'
        }, { quoted: msg });
      }

      url = video.url;
      title = video.title || title;
      duration = video.timestamp || '';

      await sock.sendMessage(remoteJid, {
        text: `🎬 *${title}*\n⏱️ ${duration || 'Desconocido'}\n\n⏳ Descargando y convirtiendo (esto puede demorar un poco)...`
      }, { quoted: msg });
    } else {
      await sock.sendMessage(remoteJid, {
        text: '⏳ Descargando video...'
      }, { quoted: msg });
    }

    if (url.includes('list=')) {
      return sock.sendMessage(remoteJid, {
        text: '❌ No se permiten playlists.'
      }, { quoted: msg });
    }

    const id = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;
    const rawFilePattern = path.join(TEMP_DIR, `yt_raw_${id}.%(ext)s`);
    finalFile = path.join(TEMP_DIR, `yt_final_${id}.mp4`);

    await downloadVideo(url, rawFilePattern);

    const downloaded = fs.readdirSync(TEMP_DIR).find(f =>
      f.startsWith(`yt_raw_${id}`) &&
      (f.endsWith('.mp4') || f.endsWith('.webm') || f.endsWith('.mkv') || f.endsWith('.m4a'))
    );

    if (!downloaded) {
      return sock.sendMessage(remoteJid, {
        text: '❌ No se pudo descargar el video a través del VPN.'
      }, { quoted: msg });
    }

    downloadedPath = path.join(TEMP_DIR, downloaded);

    // Convertimos usando 1 solo núcleo para proteger el juego
    await convertVideo(downloadedPath, finalFile);

    if (!fs.existsSync(finalFile)) {
      return sock.sendMessage(remoteJid, {
        text: '❌ No se pudo generar el video final.'
      }, { quoted: msg });
    }

    const sizeMB = fs.statSync(finalFile).size / 1024 / 1024;

    if (sizeMB > 45) {
      return sock.sendMessage(remoteJid, {
        text: `⚠️ Video muy pesado (${sizeMB.toFixed(1)} MB). Límite de WhatsApp superado.`
      }, { quoted: msg });
    }

    // Enviar video
    await sock.sendMessage(remoteJid, {
      video: fs.readFileSync(finalFile),
      mimetype: 'video/mp4',
      fileName: `${title}.mp4`
    }, { quoted: msg });

    // Dar XP
    let xp = Math.floor(Math.random() * 20) + 10;
    if (events?.getState?.()?.type === 'double') {
      xp *= 2;
    }
    await db.addXP(sender, xp);

  } finally {
    for (const file of [downloadedPath, finalFile]) {
      try {
        if (file && fs.existsSync(file)) fs.unlinkSync(file);
      } catch {}
    }
  }
}

module.exports = {
  commands: ['ytmp4', 'video', 'ytvideo'],

  async execute({ sock, remoteJid, args, sender, msg, pushName }) {
    try {
      if (!args.length) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Envía un link o nombre del video.\n\nEjemplo:\n.ytmp4 bad bunny'
        }, { quoted: msg });
      }

      const query = args.join(' ').trim();

      if (!queues.has(remoteJid)) {
        queues.set(remoteJid, []);
      }

      const queue = queues.get(remoteJid);
      const isProcessing = processingChats.has(remoteJid);
      
      const activeCount = queue.length + (isProcessing ? 1 : 0);

      if (activeCount >= 2) {
        if (!warnedChats.has(remoteJid)) {
          warnedChats.set(remoteJid, new Set());
        }
        
        const warnedUsers = warnedChats.get(remoteJid);
        if (warnedUsers.has(sender)) {
          return; 
        }

        warnedUsers.add(sender);
        return sock.sendMessage(remoteJid, {
          text: `⚠️ *COLA LLENA*\n\n@${sender.split('@')[0]}, ya hay 2 videos procesándose o en espera en este chat. Por favor, espera a que termine uno para pedir más.`,
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
        text: position === 0
? `📥 *Video añadido a la cola*

👤 Pedido por: @${sender.split('@')[0]}
🎬 Búsqueda: *${query}*

⏳ Tu video empezará a procesarse en breve.`
: `📥 *Video añadido a la cola*

👤 Pedido por: @${sender.split('@')[0]}
🎬 Búsqueda: *${query}*
📌 Posición en cola: *#${position + 1}*

⏳ Tu pedido se empezará a procesar en aproximadamente *${waitMin} minuto(s)*.
🚫 No necesitas volver a usar el comando.`,
        mentions: [sender]
      }, { quoted: msg });

      processQueue(remoteJid);

    } catch (err) {
      console.log('❌ Error en añadir a cola de videos:', err?.message || err);
      await sock.sendMessage(remoteJid, {
        text: '❌ Error al intentar añadir tu pedido a la cola.'
      }, { quoted: msg });
    }
  }
};
