'use strict';

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
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

function isTikTokUrl(url = '') {
  return /tiktok\.com/i.test(url);
}

async function downloadTikTok(url, output) {
  const attempts = [
    {
      name: 'normal mejor calidad',
      args: [
        '--no-playlist',
        '--force-overwrites',
        '--merge-output-format', 'mp4',
        '-f', 'bv*+ba/b',
        '--add-header', 'user-agent:Mozilla/5.0 (Linux; Android 10)',
        '--add-header', 'referer:https://www.tiktok.com/',
        '-o', output,
        url
      ]
    },
    {
      name: 'mp4 directo',
      args: [
        '--no-playlist',
        '--force-overwrites',
        '-f', 'b[ext=mp4]/best[ext=mp4]/best',
        '--add-header', 'user-agent:Mozilla/5.0 (Linux; Android 10)',
        '--add-header', 'referer:https://www.tiktok.com/',
        '-o', output,
        url
      ]
    },
    {
      name: 'sin formato específico',
      args: [
        '--no-playlist',
        '--force-overwrites',
        '--merge-output-format', 'mp4',
        '--add-header', 'user-agent:Mozilla/5.0 (Linux; Android 10)',
        '--add-header', 'referer:https://www.tiktok.com/',
        '-o', output,
        url
      ]
    },
    {
      name: 'best fallback',
      args: [
        '--no-playlist',
        '--force-overwrites',
        '-f', 'b/best',
        '--add-header', 'user-agent:Mozilla/5.0 (Linux; Android 10)',
        '-o', output,
        url
      ]
    }
  ];

  let lastError = null;

  for (const attempt of attempts) {
    try {
      try {
        if (fs.existsSync(output)) fs.unlinkSync(output);
      } catch {}

      console.log(`🎬 TikTok intento: ${attempt.name}`);

      await execFileAsync('yt-dlp', attempt.args, {
        timeout: 180000,
        maxBuffer: 1024 * 1024 * 10
      });

      if (fs.existsSync(output) && fs.statSync(output).size > 0) {
        return;
      }

      throw new Error('yt-dlp terminó, pero no creó el archivo.');

    } catch (err) {
      lastError = err;
      console.log(`⚠️ Falló intento TikTok (${attempt.name}):`, err?.message || err);
    }
  }

  throw lastError || new Error('No se pudo descargar el TikTok.');
}

async function convertVideo(input, output) {
  await execFileAsync('ffmpeg', [
    '-y',
    '-i', input,

    // ✅ Video compatible con WhatsApp / Estados
    '-vf', "scale='min(720,iw)':-2",
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '28',
    '-pix_fmt', 'yuv420p',
    '-profile:v', 'baseline',
    '-level', '3.1',

    // ✅ Audio compatible
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', '44100',
    '-ac', '2',

    // ✅ Mejora compatibilidad al subir/descargar
    '-movflags', '+faststart',

    output
  ]);
}

module.exports = {
  commands: ['tiktok', 'tt', 'tiktokdl'],

  async execute({ sock, remoteJid, args, sender, msg }) {
    let rawFile = null;
    let finalFile = null;

    try {
      if (!args.length) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Envía un link de TikTok.\n\nEjemplo:\n.tiktok https://...'
        }, { quoted: msg });
      }

      const url = args[0];

      if (!isTikTokUrl(url)) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Link inválido de TikTok.'
        }, { quoted: msg });
      }

      ensureTemp();

      await sock.sendMessage(remoteJid, {
        text: '⏳ Descargando video sin marca de agua...'
      }, { quoted: msg });

      const id = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;

      rawFile = path.join(TEMP_DIR, `tt_raw_${id}.mp4`);
      finalFile = path.join(TEMP_DIR, `tt_final_${id}.mp4`);

      await downloadTikTok(url, rawFile);
      await convertVideo(rawFile, finalFile);

      if (!fs.existsSync(finalFile)) {
        return sock.sendMessage(remoteJid, {
          text: '❌ No se pudo procesar el video.'
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
        caption: '🎬 TikTok sin marca de agua'
      }, { quoted: msg });

      let xp = Math.floor(Math.random() * 15) + 5;

      if (events?.getState?.()?.type === 'double') {
        xp *= 2;
      }

      await db.addXP(sender, xp);

    } catch (err) {
      console.log('❌ Error en tiktok:', err?.message || err);

      await sock.sendMessage(remoteJid, {
        text:
`❌ Error al descargar TikTok.

Puede ser que ese video esté restringido, no disponible para yt-dlp o TikTok haya bloqueado ese enlace temporalmente.`
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
