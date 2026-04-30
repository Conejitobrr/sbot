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

  const quoted = context?.quotedMessage;

  if (!quoted) return null;

  if (quoted.stickerMessage) {
    return quoted.stickerMessage;
  }

  return null;
}

async function downloadSticker(media) {
  const stream = await downloadContentFromMessage(media, 'sticker');
  const chunks = [];

  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

async function convertToImage(input, output, isAnimated) {
  const args = isAnimated
    ? ['-y', '-i', input, '-vframes', '1', output]
    : ['-y', '-i', input, output];

  await execFileAsync('ffmpeg', args);
}

module.exports = {
  commands: ['toimage', 'img'],

  async execute(ctx) {
    const { sock, msg, remoteJid } = ctx;

    let input = null;
    let output = null;

    try {
      ensureTemp();

      const sticker = getQuotedSticker(msg);

      if (!sticker) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Responde a un *sticker* con *.toimage*'
        }, { quoted: msg });
      }

      if (!sticker.url && !sticker.mediaKey) {
        return sock.sendMessage(remoteJid, {
          text: '❌ No se pudo obtener el sticker.'
        }, { quoted: msg });
      }

      const buffer = await downloadSticker(sticker);

      if (!buffer.length) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Error descargando el sticker.'
        }, { quoted: msg });
      }

      const id = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;

      input = path.join(TEMP_DIR, `toimg_${id}.webp`);
      output = path.join(TEMP_DIR, `toimg_${id}.png`);

      fs.writeFileSync(input, buffer);

      await convertToImage(input, output, sticker.isAnimated);

      const image = fs.readFileSync(output);

      await sock.sendMessage(remoteJid, {
        image,
        caption: '🖼 Convertido a imagen'
      }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error en toimage:', err?.message || err);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error al convertir sticker.\nVerifica que ffmpeg esté instalado.'
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
