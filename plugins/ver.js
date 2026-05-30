'use strict';

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const execFileAsync = promisify(execFile);

const deletedCache = new Map();

const MAX_CACHE = 1000;
const CACHE_TIME = 2 * 60 * 60 * 1000;
const TEMP_DIR = path.join(process.cwd(), 'temp');

function ensureTemp() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

function cleanJid(jid = '') {
  return String(jid).split(':')[0];
}

function number(jid = '') {
  return cleanJid(jid)
    .split('@')[0]
    .replace(/\D/g, '');
}

function cleanName(name = '') {
  return String(name || '')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
}

function escapeRegExp(text = '') {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getMsgKey(remoteJid, id) {
  return `${remoteJid}:${id}`;
}

function isDeleteMessage(msg) {
  const protocol = msg.message?.protocolMessage;

  if (!protocol) return false;

  return (
    protocol.type === 0 ||
    protocol.type === 'REVOKE' ||
    protocol.key?.id
  );
}

function getDeletedKey(msg) {
  return msg.message?.protocolMessage?.key || null;
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

function getContextInfo(message = {}) {
  return (
    message.extendedTextMessage?.contextInfo ||
    message.imageMessage?.contextInfo ||
    message.videoMessage?.contextInfo ||
    message.audioMessage?.contextInfo ||
    message.stickerMessage?.contextInfo ||
    message.documentMessage?.contextInfo ||
    null
  );
}

function getMessageMentions(message = {}) {
  const ctx = getContextInfo(message);

  return Array.isArray(ctx?.mentionedJid)
    ? ctx.mentionedJid.map(cleanJid).filter(Boolean)
    : [];
}

function uniqueMentions(list = []) {
  return [...new Set(
    list
      .map(cleanJid)
      .filter(Boolean)
  )];
}

function getDisplayName(jid, store, groupMetadata) {
  const clean = cleanJid(jid);

  const contact =
    store?.contacts?.[clean] ||
    store?.contacts?.[jid] ||
    {};

  const participant = groupMetadata?.participants?.find(p =>
    cleanJid(p.id) === clean ||
    cleanJid(p.jid) === clean ||
    cleanJid(p.lid) === clean ||
    cleanJid(p.participant) === clean
  ) || {};

  const name = cleanName(
    contact.name ||
    contact.notify ||
    contact.verifiedName ||
    contact.pushName ||
    participant.name ||
    participant.notify ||
    participant.verifiedName ||
    participant.pushName ||
    ''
  );

  return name || number(clean);
}

function getMentionMap(message = {}, store, groupMetadata) {
  const mentioned = getMessageMentions(message);
  const map = {};

  for (const jid of mentioned) {
    const clean = cleanJid(jid);
    map[clean] = getDisplayName(clean, store, groupMetadata);
  }

  return map;
}

function replaceMentionNumbers(text = '', mentionMap = {}) {
  let output = String(text || '');

  for (const [jid, name] of Object.entries(mentionMap)) {
    const num = number(jid);
    const display = cleanName(name);

    if (!num || !display) continue;

    const regex = new RegExp(`@${escapeRegExp(num)}(?=\\s|$|\\n|\\r|\\t|[.,!¡¿?;:])`, 'g');
    output = output.replace(regex, `@${display}`);
  }

  return output;
}

function getText(message = {}) {
  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    message.documentMessage?.caption ||
    ''
  );
}

// ✅ Detector adaptado desde tu plugin ver.js
function getMediaInfo(message = {}) {
  if (message.imageMessage) {
    return {
      type: 'image',
      mediaType: 'image',
      media: message.imageMessage,
      mimetype: message.imageMessage.mimetype || 'image/jpeg',
      caption: message.imageMessage.caption || ''
    };
  }

  if (message.videoMessage) {
    if (message.videoMessage.gifPlayback) {
      return {
        type: 'gif',
        mediaType: 'video',
        media: message.videoMessage,
        mimetype: message.videoMessage.mimetype || 'video/mp4',
        caption: message.videoMessage.caption || '',
        gifPlayback: true
      };
    }

    return {
      type: 'video',
      mediaType: 'video',
      media: message.videoMessage,
      mimetype: message.videoMessage.mimetype || 'video/mp4',
      caption: message.videoMessage.caption || '',
      gifPlayback: false
    };
  }

  if (message.audioMessage) {
    return {
      type: 'audio',
      mediaType: 'audio',
      media: message.audioMessage,
      mimetype: message.audioMessage.mimetype || 'audio/mpeg',
      ptt: message.audioMessage.ptt || false,
      caption: ''
    };
  }

  if (message.stickerMessage) {
    return {
      type: 'sticker',
      mediaType: 'sticker',
      media: message.stickerMessage,
      mimetype: message.stickerMessage.mimetype || 'image/webp',
      caption: ''
    };
  }

  if (message.documentMessage) {
    const mimetype = message.documentMessage.mimetype || 'application/octet-stream';
    const fileName = message.documentMessage.fileName || 'archivo';
    const caption = message.documentMessage.caption || '';
    const lowerName = String(fileName).toLowerCase();

    if (mimetype === 'image/gif' || lowerName.endsWith('.gif')) {
      return {
        type: 'gif_file',
        mediaType: 'document',
        media: message.documentMessage,
        mimetype,
        fileName,
        caption
      };
    }

    if (mimetype.startsWith('image/')) {
      return {
        type: 'image',
        mediaType: 'document',
        media: message.documentMessage,
        mimetype,
        fileName,
        caption
      };
    }

    if (mimetype.startsWith('video/')) {
      return {
        type: 'video',
        mediaType: 'document',
        media: message.documentMessage,
        mimetype,
        fileName,
        caption,
        gifPlayback: false
      };
    }

    if (mimetype.startsWith('audio/')) {
      return {
        type: 'audio',
        mediaType: 'document',
        media: message.documentMessage,
        mimetype,
        fileName,
        ptt: false,
        caption
      };
    }

    return {
      type: 'document',
      mediaType: 'document',
      media: message.documentMessage,
      mimetype,
      fileName,
      caption
    };
  }

  return null;
}

async function streamToBuffer(stream) {
  let buffer = Buffer.from([]);

  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk]);
  }

  return buffer;
}

async function convertGifToMp4(inputPath, outputPath) {
  await execFileAsync('ffmpeg', [
    '-y',
    '-i', inputPath,
    '-movflags', '+faststart',
    '-pix_fmt', 'yuv420p',
    '-vf', 'fps=15,scale=trunc(iw/2)*2:trunc(ih/2)*2',
    outputPath
  ]);
}

function saveMessage(msg, remoteJid, sender, pushName, store, groupMetadata) {
  const id = msg.key?.id;

  if (!id || !msg.message) return;
  if (isDeleteMessage(msg)) return;

  const message = unwrapMessage(msg.message);

  const mentionMap = getMentionMap(message, store, groupMetadata);
  const mentions = getMessageMentions(message);
  const text = replaceMentionNumbers(getText(message), mentionMap);

  const key = getMsgKey(remoteJid, id);

  deletedCache.set(key, {
    remoteJid,
    sender: cleanJid(sender),
    pushName: pushName || 'Usuario',
    message,
    mentions,
    mentionMap,
    text,
    time: Date.now()
  });

  if (deletedCache.size > MAX_CACHE) {
    const first = deletedCache.keys().next().value;
    deletedCache.delete(first);
  }
}

function cleanOldCache() {
  const now = Date.now();

  for (const [key, value] of deletedCache.entries()) {
    if (now - value.time > CACHE_TIME) {
      deletedCache.delete(key);
    }
  }
}

async function isEnabled(db, remoteJid, fromGroup) {
  try {
    // ✅ En privado siempre activo
    if (!fromGroup) return true;

    // ✅ En grupos depende de configuración
    const value = await db.getGroupSetting(remoteJid, 'antidelete');
    return value === true;
  } catch {
    return !fromGroup;
  }
}
function buildCaption(user, mediaCaption = '') {
  return `🕵️ *MENSAJE ELIMINADO*

👤 Usuario: @${number(user)}${mediaCaption ? `\n\n💬 Caption:\n${mediaCaption}` : ''}`;
}

module.exports = {
  commands: ['antidelete', 'antiborrar'],

  async onMessage(ctx) {
    const {
      sock,
      msg,
      remoteJid,
      sender,
      pushName,
      fromGroup,
      db,
      store,
      groupMetadata
    } = ctx;

    try {
      cleanOldCache();

      // ✅ Guarda mensajes tanto en grupos como en privado
      if (!isDeleteMessage(msg)) {
        saveMessage(msg, remoteJid, sender, pushName, store, groupMetadata);
        return;
      }

      const enabled = await isEnabled(db, remoteJid, fromGroup);
      if (!enabled) return;

      const deletedKey = getDeletedKey(msg);
      const deletedId = deletedKey?.id;

      if (!deletedId) return;

      const cacheKey = getMsgKey(remoteJid, deletedId);
      const saved = deletedCache.get(cacheKey);

      if (!saved) return;

      const user = saved.sender;
      const text = saved.text || replaceMentionNumbers(getText(saved.message), saved.mentionMap || {});
      const media = getMediaInfo(saved.message);
      const mentions = uniqueMentions([user, ...(saved.mentions || [])]);

      if (!media) {
        if (!text) return;

        await sock.sendMessage(remoteJid, {
          text:
`🕵️ *MENSAJE ELIMINADO*

👤 Usuario: @${number(user)}

💬 Mensaje:
${text}`,
          mentions
        });

        deletedCache.delete(cacheKey);
        return;
      }

      const stream = await downloadContentFromMessage(
        media.media,
        media.mediaType
      );

      const buffer = await streamToBuffer(stream);

      if (!buffer || !buffer.length) {
        deletedCache.delete(cacheKey);
        return;
      }

      const fixedCaption = replaceMentionNumbers(
        media.caption || '',
        saved.mentionMap || {}
      );

      const caption = buildCaption(user, fixedCaption);

      if (media.type === 'image') {
        await sock.sendMessage(remoteJid, {
          image: buffer,
          mimetype: media.mimetype,
          caption,
          mentions
        });
      }

      if (media.type === 'video') {
        await sock.sendMessage(remoteJid, {
          video: buffer,
          mimetype: media.mimetype,
          caption,
          gifPlayback: media.gifPlayback || false,
          mentions
        });
      }

      if (media.type === 'gif') {
        await sock.sendMessage(remoteJid, {
          video: buffer,
          mimetype: 'video/mp4',
          gifPlayback: true,
          caption,
          mentions
        });
      }

      if (media.type === 'gif_file') {
        let tempInput = null;
        let tempOutput = null;

        try {
          ensureTemp();

          const id = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;
          tempInput = path.join(TEMP_DIR, `antidelete_gif_${id}.gif`);
          tempOutput = path.join(TEMP_DIR, `antidelete_gif_${id}.mp4`);

          fs.writeFileSync(tempInput, buffer);

          await convertGifToMp4(tempInput, tempOutput);

          const mp4Buffer = fs.readFileSync(tempOutput);

          await sock.sendMessage(remoteJid, {
            video: mp4Buffer,
            mimetype: 'video/mp4',
            gifPlayback: true,
            caption,
            mentions
          });

        } finally {
          for (const file of [tempInput, tempOutput]) {
            try {
              if (file && fs.existsSync(file)) {
                fs.unlinkSync(file);
              }
            } catch {}
          }
        }
      }

      if (media.type === 'audio') {
        await sock.sendMessage(remoteJid, {
          audio: buffer,
          mimetype: media.mimetype,
          ptt: media.ptt || false
        });

        await sock.sendMessage(remoteJid, {
          text: caption,
          mentions
        });
      }

      if (media.type === 'sticker') {
        await sock.sendMessage(remoteJid, {
          sticker: buffer
        });

        await sock.sendMessage(remoteJid, {
          text: caption,
          mentions
        });
      }

      if (media.type === 'document') {
        await sock.sendMessage(remoteJid, {
          document: buffer,
          mimetype: media.mimetype,
          fileName: media.fileName || 'archivo',
          caption,
          mentions
        });
      }

      deletedCache.delete(cacheKey);

    } catch (err) {
      console.log('❌ Error en antidelete:', err?.message || err);
    }
  },

  async execute(ctx) {
    const {
      sock,
      msg,
      remoteJid,
      args,
      fromGroup,
      isAdmin,
      isOwner,
      db
    } = ctx;

    try {
      // ✅ En privado siempre activo
      if (!fromGroup) {
        return sock.sendMessage(remoteJid, {
          text: '✅ En chats privados, *antidelete* siempre está activo.'
        }, { quoted: msg });
      }

      if (!isOwner && !isAdmin) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Solo admins o owner pueden usar este comando.'
        }, { quoted: msg });
      }

      const option = (args[0] || '').toLowerCase();

      if (!option) {
        const enabled = await isEnabled(db, remoteJid, fromGroup);

        return sock.sendMessage(remoteJid, {
          text:
`🕵️ *ANTIDELETE*

Estado: *${enabled ? 'Activado ✅' : 'Desactivado ❌'}*

Uso:
.antidelete on
.antidelete off`
        }, { quoted: msg });
      }

      if (!['on', 'off'].includes(option)) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Usa:\n.antidelete on\n.antidelete off'
        }, { quoted: msg });
      }

      await db.setGroupSetting(
        remoteJid,
        'antidelete',
        option === 'on'
      );

      return sock.sendMessage(remoteJid, {
        text: option === 'on'
          ? '✅ Antidelete activado en este grupo.'
          : '✅ Antidelete desactivado en este grupo.'
      }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error comando antidelete:', err?.message || err);

      return sock.sendMessage(remoteJid, {
        text: '❌ Error configurando antidelete.'
      }, { quoted: msg });
    }
  }
};
