'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');
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

function sanitizeFileName(name = 'audio') {
  return String(name)
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
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

module.exports = {
  commands: ['music', 'song', 'mp3'],

  async execute({ sock, remoteJid, args, msg }) {

    let finalAudio = null;
    let thumbPath = null;

    try {

      if (!args.length) {
        return sock.sendMessage(remoteJid, {
          text:
`❌ Ingresa una canción.

Ejemplo:
.music bad bunny dakiti`
        }, { quoted: msg });
      }

      ensureTemp();

      const query = args.join(' ');
      let url = query;

      await sock.sendMessage(remoteJid, {
        text: '🔍 Buscando canción...'
      }, { quoted: msg });

      let video = null;

      if (!isYouTubeUrl(query)) {
        video = await searchYouTube(query);

        if (!video) {
          return sock.sendMessage(remoteJid, {
            text: '❌ No se encontraron resultados.'
          }, { quoted: msg });
        }

        url = video.url;
      } else {

        const search = await yts({ videoId: query });

        if (search) {
          video = search;
        }
      }

      if (!video) {
        return sock.sendMessage(remoteJid, {
          text: '❌ No se pudo obtener información del video.'
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

⏳ Preparando audio premium...`
      }, { quoted: msg });

      const id = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;

      const rawOutput = path.join(
        TEMP_DIR,
        `music_${id}.%(ext)s`
      );

      await downloadAudio(url, rawOutput);

      const files = fs.readdirSync(TEMP_DIR);

      const downloaded = files.find(f =>
        f.startsWith(`music_${id}`) &&
        f.endsWith('.mp3')
      );

      if (!downloaded) {
        return sock.sendMessage(remoteJid, {
          text: '❌ No se pudo descargar el audio.'
        }, { quoted: msg });
      }

      const downloadedPath = path.join(TEMP_DIR, downloaded);

      // 🔥 DESCARGAR THUMBNAIL
      thumbPath = path.join(TEMP_DIR, `thumb_${id}.jpg`);

      const thumbUrl =
        video.thumbnail ||
        video.image ||
        `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;

      const response = await axios.get(thumbUrl, {
        responseType: 'arraybuffer'
      });

      fs.writeFileSync(thumbPath, response.data);

      // 🔥 AUDIO FINAL CON METADATA + CARÁTULA
      finalAudio = path.join(
        TEMP_DIR,
        `${title}_${id}.mp3`
      );

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

        fs.unlinkSync(finalAudio);

        return sock.sendMessage(remoteJid, {
          text: '❌ El audio pesa demasiado.'
        }, { quoted: msg });
      }

      const thumbBuffer = fs.readFileSync(thumbPath);

      // 🔥 MENSAJE ESTILO SPOTIFY
      await sock.sendMessage(remoteJid, {
        image: thumbBuffer,
        caption:
`🎧 *Sirius Music*

🎶 *${title}*
👤 ${artist}
⏱️ ${duration}
💿 MP3 320K`
      }, { quoted: msg });

      // 🔥 ENVIAR AUDIO FINAL
      await sock.sendMessage(remoteJid, {
        audio: fs.readFileSync(finalAudio),
        mimetype: 'audio/mpeg',
        fileName: `${title}.mp3`,
        ptt: false
      }, { quoted: msg });

      // 🧹 LIMPIAR
      try {
        fs.unlinkSync(downloadedPath);
      } catch {}

      try {
        fs.unlinkSync(finalAudio);
      } catch {}

      try {
        fs.unlinkSync(thumbPath);
      } catch {}

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

      try {
        if (finalAudio && fs.existsSync(finalAudio)) {
          fs.unlinkSync(finalAudio);
        }
      } catch {}

      try {
        if (thumbPath && fs.existsSync(thumbPath)) {
          fs.unlinkSync(thumbPath);
        }
      } catch {}
    }
  }
};
