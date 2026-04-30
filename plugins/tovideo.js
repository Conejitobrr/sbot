'use strict';

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const execFileAsync = promisify(execFile);
const TEMP_DIR = path.join(process.cwd(), 'temp');

function ensureTemp() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

function getQuotedSticker(msg) {
  const context =
    msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.imageMessage?.contextInfo ||
    msg.message?.videoMessage?.contextInfo;

  return context?.quotedMessage?.stickerMessage || null;
}

async function downloadSticker(sticker) {
  const stream = await downloadContentFromMessage(sticker, 'sticker');
  const chunks = [];

  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

async function convertStickerToVideo(input, output) {
  await execFileAsync('ffmpeg', [
    '-y',
    '-i', input,
    '-movflags', 'faststart',
    '-pix_fmt', 'yuv420p',
    '-vf', 'scale=512:-2:flags=lanczos,fps=15',
    output
  ]);
}

module.exports = {
  commands: ['tovideo', 'tomp4'],

  async execute(ctx) {
    const { sock, msg, remoteJid } = ctx;

    let input = null;
    let output = null;

    try {
      ensureTemp();

      const sticker = getQuotedSticker(msg);

      if (!sticker) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Responde a un sticker con *.tovideo*'
        }, { quoted: msg });
      }

      if (!sticker.isAnimated) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Este comando solo sirve con stickers animados.'
        }, { quoted: msg });
      }

      const buffer = await downloadSticker(sticker);

      if (!buffer.length) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Error descargando el sticker.'
        }, { quoted: msg });
      }

      const id = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;

      input = path.join(TEMP_DIR, `tovideo_${id}.webp`);
      output = path.join(TEMP_DIR, `tovideo_${id}.mp4`);

      fs.writeFileSync(input, buffer);

      await convertStickerToVideo(input, output);

      const video = fs.readFileSync(output);

      await sock.sendMessage(remoteJid, {
        video,
        mimetype: 'video/mp4'
      }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error en tovideo:', err?.message || err);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error al convertir sticker a video.\nAsegúrate de tener ffmpeg instalado.'
      }, { quoted: msg });

    } finally {
      for (const file of [input, output]) {
        try {
          if (file && fs.existsSync(file)) fs.unlinkSync(file);
        } catch {}
      }
    }
  }
};
