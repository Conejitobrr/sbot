'use strict';

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const yts = require('yt-search');

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

// 🔥 MEJOR BÚSQUEDA
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

// 🔥 DESCARGA MEJORADA
async function downloadAudio(url, output) {
  await execFileAsync('yt-dlp', [
    '--extractor-args', 'youtube:player_client=android',
    '--geo-bypass',
    '--force-ipv4',
    '--no-playlist',
    '--ignore-errors',
    '--no-warnings',

    '-x',
    '--audio-format', 'mp3',
    '--audio-quality', '128K',

    '-o', output,
    url
  ]);
}

module.exports = {
  commands: ['yt', 'play', 'youtube'],

  async execute({ sock, remoteJid, args, msg }) {
    let file = null;

    try {
      if (!args.length) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Envía un link o nombre de canción.\n\nEjemplo:\n.play bad bunny'
        }, { quoted: msg });
      }

      ensureTemp();

      const query = args.join(' ');
      let url = query;
      let title = 'Audio de YouTube';
      let duration = '';

      // 🔍 BUSCAR SI NO ES LINK
      if (!isYouTubeUrl(query)) {

        await sock.sendMessage(remoteJid, {
          text: '🔍 Buscando en YouTube...'
        }, { quoted: msg });

        const video = await searchYouTube(query);

        if (!video) {
          return sock.sendMessage(remoteJid, {
            text: '❌ No se encontraron resultados.'
          }, { quoted: msg });
        }

        url = video.url;
        title = video.title || title;
        duration = video.timestamp || '';

        await sock.sendMessage(remoteJid, {
          text:
`🎬 *${title}*
⏱️ ${duration || 'Desconocido'}

⏳ Descargando audio...`
        }, { quoted: msg });

      } else {

        await sock.sendMessage(remoteJid, {
          text: '⏳ Descargando audio...'
        }, { quoted: msg });
      }

      const id = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;

      file = path.join(
        TEMP_DIR,
        `yt_audio_${id}.%(ext)s`
      );

      // 🔥 DESCARGAR
      await downloadAudio(url, file);

      // 🔥 BUSCAR MP3 REAL
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

      const finalPath = path.join(TEMP_DIR, downloaded);

      const sizeMB = fs.statSync(finalPath).size / 1024 / 1024;

      if (sizeMB > 95) {

        fs.unlinkSync(finalPath);

        return sock.sendMessage(remoteJid, {
          text: '❌ El audio pesa demasiado para enviarlo por WhatsApp.'
        }, { quoted: msg });
      }

      await sock.sendMessage(remoteJid, {
        audio: fs.readFileSync(finalPath),
        mimetype: 'audio/mpeg',
        fileName: `${title}.mp3`
      }, { quoted: msg });

      // 🧹 BORRAR
      fs.unlinkSync(finalPath);

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
