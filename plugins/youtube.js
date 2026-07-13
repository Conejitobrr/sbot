'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios'); // 🔥 Usaremos Axios para conectar con las APIs inmunes
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
  // 🔥 EL BYPASS DEFINITIVO: APIs externas
  try {
    // Intento 1: API de Siputzx (Muy rápida y estable para Bots)
    const res1 = await axios.get(`https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(url)}`);
    const dlLink1 = res1.data?.data?.dl;
    
    if (!dlLink1) throw new Error("Fallo API 1");
    
    // Descargamos el archivo directamente al servidor
    const audioBuffer1 = await axios.get(dlLink1, { responseType: 'arraybuffer' });
    fs.writeFileSync(output, audioBuffer1.data);
    return;
    
  } catch (err1) {
    console.log('⚠️ API 1 bloqueada, usando API de respaldo...');
    
    // Intento 2: API Delirius (El mejor respaldo)
    const res2 = await axios.get(`https://delirius-apiofc.vercel.app/download/ytmp3?url=${encodeURIComponent(url)}`);
    const dlLink2 = res2.data?.data?.download;
    
    if (!dlLink2) throw new Error("Todas las APIs fallaron");
    
    const audioBuffer2 = await axios.get(dlLink2, { responseType: 'arraybuffer' });
    fs.writeFileSync(output, audioBuffer2.data);
  }
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
    finalPath = path.join(TEMP_DIR, `yt_audio_${id}.mp3`); // 🔥 Código simplificado

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
