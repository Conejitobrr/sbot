'use strict';

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const db = require('../lib/database');

const execFileAsync = promisify(execFile);

const TEMP_DIR = path.join(process.cwd(), 'temp');

function ensureTemp() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

function getQuotedMessage(msg) {
  const context =
    msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.imageMessage?.contextInfo ||
    msg.message?.videoMessage?.contextInfo ||
    msg.message?.documentMessage?.contextInfo;

  return context?.quotedMessage || null;
}

function getMessageContent(msg) {
  return getQuotedMessage(msg) || msg.message || null;
}

function getMediaInfo(message) {
  if (!message) return null;

  const type = Object.keys(message)[0];
  const media = message[type];

  if (!media) return null;

  const isImage =
    type === 'imageMessage' ||
    (type === 'documentMessage' && media.mimetype?.startsWith('image/'));

  const isVideo =
    type === 'videoMessage' ||
    (type === 'documentMessage' && media.mimetype?.startsWith('video/'));

  if (!isImage && !isVideo) return null;

  return {
    type,
    media,
    isImage,
    isVideo,
    downloadType:
      type === 'documentMessage'
        ? 'document'
        : isVideo
          ? 'video'
          : 'image'
  };
}

async function downloadMedia(media, downloadType) {
  const stream = await downloadContentFromMessage(media, downloadType);
  const chunks = [];

  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

function getExtension(media, isImage) {
  const mime = media.mimetype || '';

  if (isImage) {
    if (mime.includes('png')) return 'png';
    if (mime.includes('webp')) return 'webp';
    return 'jpg';
  }

  if (mime.includes('webm')) return 'webm';
  return 'mp4';
}

async function makeSticker(input, output, isImage) {
  const args = isImage
    ? [
        '-y',
        '-i', input,
        '-vf',
        'scale=512:512:force_original_aspect_ratio=decrease:flags=lanczos,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
        '-vcodec', 'libwebp',
        '-q:v', '60',
        '-compression_level', '6',
        '-preset', 'picture',
        '-loop', '0',
        output
      ]
    : [
        '-y',
        '-i', input,
        '-t', '5',
        '-vf',
        'scale=512:512:force_original_aspect_ratio=decrease:flags=lanczos,fps=10,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
        '-vcodec', 'libwebp',
        '-fs', '700k',
        '-loop', '0',
        '-an',
        output
      ];

  await execFileAsync('ffmpeg', args);
}

module.exports = {
  commands: ['s', 'sticker', 'stiker'],

  async execute(ctx) {
    const { sock, msg, remoteJid, sender } = ctx;

    let input = null;
    let output = null;

    try {
      ensureTemp();

      const message = getMessageContent(msg);
      const info = getMediaInfo(message);

      if (!info) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Envía o responde a una imagen/video para crear sticker.'
        }, { quoted: msg });
      }

      if (!info.media.url && !info.media.mediaKey) {
        return sock.sendMessage(remoteJid, {
          text: '❌ No se pudo obtener el archivo.'
        }, { quoted: msg });
      }

      const buffer = await downloadMedia(info.media, info.downloadType);

      if (!buffer.length) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Error descargando el archivo.'
        }, { quoted: msg });
      }

      const ext = getExtension(info.media, info.isImage);
      const id = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;

      input = path.join(TEMP_DIR, `sticker_input_${id}.${ext}`);
      output = path.join(TEMP_DIR, `sticker_output_${id}.webp`);

      fs.writeFileSync(input, buffer);

      await makeSticker(input, output, info.isImage);

      const sticker = fs.readFileSync(output);

      await sock.sendMessage(remoteJid, {
        sticker
      }, { quoted: msg });

      await db.addXP(sender, Math.floor(Math.random() * 10) + 5);

    } catch (err) {
      console.log('❌ Error en sticker:', err?.message || err);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error al crear sticker. Asegúrate de tener ffmpeg instalado.'
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
