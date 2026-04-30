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

function isFacebookUrl(url = '') {
  return /(facebook\.com|fb\.watch)/i.test(url);
}

async function downloadFacebook(url, output) {
  await execFileAsync('yt-dlp', [
    '-f', 'mp4/best',
    '--no-playlist',
    '--add-header', 'user-agent:Mozilla/5.0',
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
  commands: ['facebook', 'fb', 'fbdl'],

  async execute({ sock, remoteJid, args, sender, msg }) {
    let rawFile = null;
    let finalFile = null;

    try {
      if (!args.length) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Envía un link de Facebook.\n\nEjemplo:\n.fb https://...'
        }, { quoted: msg });
      }

      const url = args[0];

      if (!isFacebookUrl(url)) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Link inválido de Facebook.'
        }, { quoted: msg });
      }

      ensureTemp();

      await sock.sendMessage(remoteJid, {
        text: '⏳ Descargando video de Facebook...'
      }, { quoted: msg });

      const id = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;

      rawFile = path.join(TEMP_DIR, `fb_raw_${id}.mp4`);
      finalFile = path.join(TEMP_DIR, `fb_final_${id}.mp4`);

      await downloadFacebook(url, rawFile);
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
        caption: '📘 Descargado desde Facebook'
      }, { quoted: msg });

      let xp = Math.floor(Math.random() * 15) + 5;

      if (events?.getState?.()?.type === 'double') {
        xp *= 2;
      }

      await db.addXP(sender, xp);

    } catch (err) {
      console.log('❌ Error en facebook:', err?.message || err);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error al descargar Facebook.\nVerifica yt-dlp y ffmpeg.'
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
