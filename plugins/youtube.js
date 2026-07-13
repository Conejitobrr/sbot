'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const yts = require('yt-search');

const TEMP_DIR = path.join(process.cwd(), 'temp');

// ⏳ COLA POR CHAT: 1 canción cada 2 minutos
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
  let audioUrl = null;

  // 🔥 BATERÍA DE 4 APIs INMUNES Y ACTUALIZADAS (Nunca fallan todas a la vez)
  const apis = [
    { url: `https://api.ryzendesu.vip/api/downloader/ytmp3?url=${encodeURIComponent(url)}`, path: data => data?.url },
    { url: `https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(url)}`, path: data => data?.result?.download?.url },
    { url: `https://api.dorratz.com/v2/yt-mp3?url=${encodeURIComponent(url)}`, path: data => data?.media },
    { url: `https://bk9.fun/download/youtube?url=${encodeURIComponent(url)}`, path: data => data?.BK9?.mp3 }
  ];

  for (let api of apis) {
    try {
      console.log(`⏳ Probando API externa: ${api.url.split('/')[2]}`);
      const { data } = await axios.get(api.url, { timeout: 15000 });
      audioUrl = api.path(data);
      
      if (audioUrl) {
        console.log(`✅ ¡API exitosa! Descargando pista...`);
        break; // Salimos del bucle si encontramos el link de la canción
      }
    } catch (err) {
      console.log(`⚠️ API caída o falló (404/500). Pasando a la siguiente API de respaldo...`);
    }
  }

  if (!audioUrl) {
    throw new Error("Todas las APIs externas están caídas en este momento.");
  }

  // Descargamos el MP3 final a tu servidor y luego al chat
  const audioBuffer = await axios.get(audioUrl, { responseType: 'arraybuffer' });
  fs.writeFileSync(output, audioBuffer.data);
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
    finalPath = path.join(TEMP_DIR, `yt_audio_${id}.mp3`);

    await downloadAudio(url, finalPath);

    if (!fs.existsSync(finalPath)) {
      return sock.sendMessage(remoteJid, {
        text: '❌ No se pudo descargar el audio.'
      }, { quoted: msg });
    }

    const sizeMB = fs.statSync(finalPath).size / 1024 / 1024;

    if (sizeMB > 95) {
      return sock.sendMessage(remoteJid, {
        text: '❌ El audio pesa demasiado.'
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
      const activeCount = queue.length + (isProcessing ? 1 : 0);

      if (activeCount >= 2) {
        if (!warnedChats.has(remoteJid)) {
          warnedChats.set(remoteJid, new Set());
        }
        const warnedUsers = warnedChats.get(remoteJid);
        if (warnedUsers.has(sender)) return; 
        
        warnedUsers.add(sender);
        return sock.sendMessage(remoteJid, {
          text: `⚠️ *COLA LLENA*\n\n@${sender.split('@')[0]}, ya hay 2 canciones procesándose. Espera un momento.`,
          mentions: [sender]
        }, { quoted: msg });
      }

      const position = queue.length + (isProcessing ? 1 : 0);
      const waitMin = position === 0 ? 0 : position * 2;

      queue.push({
        sock, remoteJid, args, msg, sender, pushName: pushName || 'Usuario', query
      });

      await sock.sendMessage(remoteJid, {
        text: position === 0
? `📥 *Canción añadida a la cola*
👤 Pedido por: @${sender.split('@')[0]}
🎶 Búsqueda: *${query}*
⏳ Procesando...`
: `📥 *Canción añadida a la cola*
👤 Pedido por: @${sender.split('@')[0]}
🎶 Búsqueda: *${query}*
📌 Posición: *#${position + 1}*`,
        mentions: [sender]
      }, { quoted: msg });

      processQueue(remoteJid);

    } catch (err) {
      console.log('❌ Error en youtube/play:', err?.message || err);
      await sock.sendMessage(remoteJid, {
        text: `❌ Error al descargar audio.`
      }, { quoted: msg });
    }
  }
};
