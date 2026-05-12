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

function ensureTemp() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

function isYouTubeUrl(text = '') {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(text);
}

// 🔥 BÚSQUEDA MEJORADA
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

// 🔥 DESCARGA MEJORADA PARA YOUTUBE
async function downloadVideo(url, output) {
  await execFileAsync('yt-dlp', [
    '--extractor-args', 'youtube:player_client=android',
    '--geo-bypass',
    '--force-ipv4',
    '--no-playlist',
    '--ignore-errors',
    '--no-warnings',

    '-f', 'bv*[height<=480]+ba/best[height<=480]/best[height<=480]/best',
    '--merge-output-format', 'mp4',

    '-o', output,
    url
  ]);
}

async function convertVideo(input, output) {
  await execFileAsync('ffmpeg', [
    '-y',
    '-i', input,
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-preset', 'veryfast',
    '-crf', '28',
    output
  ]);
}

module.exports = {
  commands: ['ytmp4', 'video', 'ytvideo'],

  async execute({ sock, remoteJid, args, sender, msg }) {
    let rawFile = null;
    let finalFile = null;

    try {
      if (!args.length) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Envía un link o nombre del video.\n\nEjemplo:\n.ytmp4 bad bunny'
        }, { quoted: msg });
      }

      ensureTemp();

      const query = args.join(' ');
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
          text: `🎬 *${title}*\n⏱️ ${duration || 'Desconocido'}\n\n⏳ Descargando...`
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

      // 🔥 yt-dlp decidirá la extensión real
      rawFile = path.join(TEMP_DIR, `yt_raw_${id}.%(ext)s`);
      finalFile = path.join(TEMP_DIR, `yt_final_${id}.mp4`);

      await downloadVideo(url, rawFile);

      // 🔥 BUSCAR ARCHIVO REAL DESCARGADO
      const downloaded = fs.readdirSync(TEMP_DIR).find(f =>
        f.startsWith(`yt_raw_${id}`) &&
        (
          f.endsWith('.mp4') ||
          f.endsWith('.webm') ||
          f.endsWith('.mkv') ||
          f.endsWith('.m4a')
        )
      );

      if (!downloaded) {
        return sock.sendMessage(remoteJid, {
          text: '❌ No se pudo descargar el video.'
        }, { quoted: msg });
      }

      const downloadedPath = path.join(TEMP_DIR, downloaded);

      await convertVideo(downloadedPath, finalFile);

      if (!fs.existsSync(finalFile)) {
        return sock.sendMessage(remoteJid, {
          text: '❌ No se pudo generar el video.'
        }, { quoted: msg });
      }

      const sizeMB = fs.statSync(finalFile).size / 1024 / 1024;

      if (sizeMB > 30) {
        return sock.sendMessage(remoteJid, {
          text: `⚠️ Video muy pesado (${sizeMB.toFixed(1)} MB)`
        }, { quoted: msg });
      }

      await sock.sendMessage(remoteJid, {
        video: fs.readFileSync(finalFile),
        mimetype: 'video/mp4',
        fileName: `${title}.mp4`
      }, { quoted: msg });

      let xp = Math.floor(Math.random() * 20) + 10;

      if (events?.getState?.()?.type === 'double') {
        xp *= 2;
      }

      await db.addXP(sender, xp);

      // 🧹 LIMPIAR DESCARGA REAL
      try {
        if (downloadedPath && fs.existsSync(downloadedPath)) {
          fs.unlinkSync(downloadedPath);
        }
      } catch {}

    } catch (err) {
      console.log('❌ Error en ytmp4:', err?.message || err);

      await sock.sendMessage(remoteJid, {
        text:
`❌ Error al descargar video.

📌 Prueba otro video o link.
📌 Verifica yt-dlp y ffmpeg.`
      }, { quoted: msg });

    } finally {
      for (const file of [rawFile, finalFile]) {
        try {
          if (file && fs.existsSync(file)) fs.unlinkSync(file);
        } catch {}
      }
    }
  }
};
