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

function getQuotedContext(msg) {
  return (
    msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.imageMessage?.contextInfo ||
    msg.message?.videoMessage?.contextInfo ||
    msg.message?.audioMessage?.contextInfo ||
    msg.message?.documentMessage?.contextInfo ||
    null
  );
}

function unwrapMessage(message = {}) {
  if (message.ephemeralMessage?.message) {
    return unwrapMessage(message.ephemeralMessage.message);
  }

  if (message.documentWithCaptionMessage?.message) {
    return unwrapMessage(message.documentWithCaptionMessage.message);
  }

  return message;
}

function getQuotedMessage(msg) {
  const ctx = getQuotedContext(msg);
  const quoted = ctx?.quotedMessage || null;

  return quoted ? unwrapMessage(quoted) : null;
}

function getMessageContent(msg) {
  return getQuotedMessage(msg) || unwrapMessage(msg.message || {});
}

function getMediaInfo(message = {}) {
  if (message.videoMessage) {
    return {
      type: 'video',
      downloadType: 'video',
      media: message.videoMessage,
      mimetype: message.videoMessage.mimetype || 'video/mp4'
    };
  }

  if (message.audioMessage) {
    return {
      type: 'audio',
      downloadType: 'audio',
      media: message.audioMessage,
      mimetype: message.audioMessage.mimetype || 'audio/mpeg'
    };
  }

  if (message.documentMessage) {
    const mimetype = message.documentMessage.mimetype || '';
    const fileName = message.documentMessage.fileName || 'archivo';

    if (mimetype.startsWith('video/') || mimetype.startsWith('audio/')) {
      return {
        type: mimetype.startsWith('video/') ? 'video' : 'audio',
        downloadType: 'document',
        media: message.documentMessage,
        mimetype,
        fileName
      };
    }
  }

  return null;
}

async function downloadMedia(media, downloadType) {
  const stream = await downloadContentFromMessage(media, downloadType);
  const chunks = [];

  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

function getExtension(mimetype = '') {
  const mime = String(mimetype).toLowerCase();

  if (mime.includes('mp4')) return 'mp4';
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('opus')) return 'ogg';
  if (mime.includes('mpeg')) return 'mp3';
  if (mime.includes('mp3')) return 'mp3';
  if (mime.includes('wav')) return 'wav';
  if (mime.includes('m4a')) return 'm4a';

  return 'bin';
}

async function convertToMp3(input, output) {
  await execFileAsync('ffmpeg', [
    '-y',
    '-i', input,
    '-vn',
    '-acodec', 'libmp3lame',
    '-b:a', '192k',
    '-ar', '44100',
    output
  ]);
}

module.exports = {
  commands: ['tomp3', 'mp3', 'toaudio'],

  async execute(ctx) {
    const { sock, msg, remoteJid, sender, db } = ctx;

    let input = null;
    let output = null;

    try {
      ensureTemp();

      const message = getMessageContent(msg);
      const info = getMediaInfo(message);

      if (!info) {
        return sock.sendMessage(remoteJid, {
          text:
`❌ Responde a un video, audio o archivo de audio/video.

Ejemplo:
.tomp3 respondiendo a un video`
        }, { quoted: msg });
      }

      if (!info.media.url && !info.media.mediaKey) {
        return sock.sendMessage(remoteJid, {
          text: '❌ No se pudo obtener el archivo.'
        }, { quoted: msg });
      }

      const buffer = await downloadMedia(info.media, info.downloadType);

      if (!buffer || !buffer.length) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Error descargando el archivo.'
        }, { quoted: msg });
      }

      const id = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;
      const ext = getExtension(info.mimetype);

      input = path.join(TEMP_DIR, `tomp3_input_${id}.${ext}`);
      output = path.join(TEMP_DIR, `tomp3_output_${id}.mp3`);

      fs.writeFileSync(input, buffer);

      await convertToMp3(input, output);

      const mp3 = fs.readFileSync(output);

      await sock.sendMessage(remoteJid, {
        audio: mp3,
        mimetype: 'audio/mpeg',
        fileName: 'audio.mp3'
      }, { quoted: msg });

      try {
        if (db?.addXP) {
          await db.addXP(sender, Math.floor(Math.random() * 16) + 10);
        }
      } catch {}

    } catch (err) {
      console.log('❌ Error en tomp3:', err?.message || err);

      return sock.sendMessage(remoteJid, {
        text: '❌ Error convirtiendo a MP3. Asegúrate de tener ffmpeg instalado.'
      }, { quoted: msg });

    } finally {
      for (const file of [input, output]) {
        try {
          if (file && fs.existsSync(file)) {
            fs.unlinkSync(file);
          }
        } catch {}
      }
    }
  }
};
