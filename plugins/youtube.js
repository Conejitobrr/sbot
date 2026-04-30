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

async function searchYouTube(query) {
  const res = await yts(query);
  return res.videos?.[0] || null;
}

async function downloadAudio(url, output) {
  await execFileAsync('yt-dlp', [
    '-x',
    '--audio-format', 'mp3',
    '--audio-quality', '128K',
    '--no-playlist',
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
          text: `🎬 *${title}*\n⏱️ ${duration || 'Desconocido'}\n\n⏳ Descargando audio...`
        }, { quoted: msg });
      } else {
        await sock.sendMessage(remoteJid, {
          text: '⏳ Descargando audio...'
        }, { quoted: msg });
      }

      const id = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;
      file = path.join(TEMP_DIR, `yt_audio_${id}.mp3`);

      await downloadAudio(url, file);

      if (!fs.existsSync(file)) {
        return sock.sendMessage(remoteJid, {
          text: '❌ No se pudo generar el audio.'
        }, { quoted: msg });
      }

      const sizeMB = fs.statSync(file).size / 1024 / 1024;

      if (sizeMB > 95) {
        return sock.sendMessage(remoteJid, {
          text: '❌ El audio pesa demasiado para enviarlo por WhatsApp.'
        }, { quoted: msg });
      }

      await sock.sendMessage(remoteJid, {
        audio: fs.readFileSync(file),
        mimetype: 'audio/mpeg',
        fileName: `${title}.mp3`
      }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error en youtube/play:', err?.message || err);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error al descargar audio.\nVerifica que tengas instalado yt-dlp y ffmpeg.'
      }, { quoted: msg });

    } finally {
      try {
        if (file && fs.existsSync(file)) fs.unlinkSync(file);
      } catch {}
    }
  }
};
