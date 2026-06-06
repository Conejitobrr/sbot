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

function isTwitterUrl(url = '') {
  return /(twitter\.com|x\.com)/i.test(url);
}

async function downloadTwitter(url, outputTemplate) {
  await execFileAsync('yt-dlp', [
    '--no-playlist',
    '--add-header',
    'user-agent:Mozilla/5.0',
    '-o',
    outputTemplate,
    url
  ]);
}

module.exports = {
  commands: ['twitter', 'x', 'xdl', 'tw'],

  async execute({ sock, remoteJid, args, sender, msg }) {
    const downloaded = [];

    try {
      if (!args.length) {
        return sock.sendMessage(
          remoteJid,
          {
            text:
              '❌ Envía un enlace de X/Twitter.\n\nEjemplo:\n.x https://x.com/...'
          },
          { quoted: msg }
        );
      }

      const url = args[0];

      if (!isTwitterUrl(url)) {
        return sock.sendMessage(
          remoteJid,
          {
            text: '❌ Link inválido de X/Twitter.'
          },
          { quoted: msg }
        );
      }

      ensureTemp();

      await sock.sendMessage(
        remoteJid,
        {
          text: '⏳ Descargando contenido de X/Twitter...'
        },
        { quoted: msg }
      );

      const id =
        Date.now() + '_' + Math.floor(Math.random() * 9999);

      const outputTemplate = path.join(
        TEMP_DIR,
        `x_${id}_%(id)s.%(ext)s`
      );

      await downloadTwitter(url, outputTemplate);

      const files = fs
        .readdirSync(TEMP_DIR)
        .filter(file => file.startsWith(`x_${id}_`));

      if (!files.length) {
        return sock.sendMessage(
          remoteJid,
          {
            text: '❌ No se encontró contenido.'
          },
          { quoted: msg }
        );
      }

      for (const file of files) {
        const filePath = path.join(TEMP_DIR, file);

        downloaded.push(filePath);

        const sizeMB =
          fs.statSync(filePath).size / 1024 / 1024;

        if (sizeMB > 50) {
          await sock.sendMessage(
            remoteJid,
            {
              text: `⚠️ Archivo muy pesado (${sizeMB.toFixed(1)} MB)`
            },
            { quoted: msg }
          );
          continue;
        }

        const buffer = fs.readFileSync(filePath);
        const lower = file.toLowerCase();

        if (
          lower.endsWith('.mp4') ||
          lower.endsWith('.mkv') ||
          lower.endsWith('.webm')
        ) {
          await sock.sendMessage(
            remoteJid,
            {
              video: buffer,
              mimetype: 'video/mp4',
              caption: '𝕏 Descargado desde X/Twitter'
            },
            { quoted: msg }
          );
        } else if (
          lower.endsWith('.jpg') ||
          lower.endsWith('.jpeg') ||
          lower.endsWith('.png') ||
          lower.endsWith('.webp')
        ) {
          await sock.sendMessage(
            remoteJid,
            {
              image: buffer,
              caption: '𝕏 Descargado desde X/Twitter'
            },
            { quoted: msg }
          );
        }
      }

      let xp = Math.floor(Math.random() * 15) + 5;

      if (events?.getState?.()?.type === 'double') {
        xp *= 2;
      }

      await db.addXP(sender, xp);

    } catch (err) {
      console.log(
        '❌ Error en Twitter:',
        err?.message || err
      );

      await sock.sendMessage(
        remoteJid,
        {
          text:
            '❌ No se pudo descargar el contenido de X/Twitter.'
        },
        { quoted: msg }
      );

    } finally {
      for (const file of downloaded) {
        try {
          if (fs.existsSync(file)) {
            fs.unlinkSync(file);
          }
        } catch {}
      }
    }
  }
};
