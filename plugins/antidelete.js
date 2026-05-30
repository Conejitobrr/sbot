'use strict';

const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const deletedCache = new Map();

const MAX_CACHE = 1000;
const CACHE_TIME = 2 * 60 * 60 * 1000;
const MAX_MEDIA_BUFFER = 60 * 1024 * 1024; // 60 MB en RAM

function cleanJid(jid = '') {
  return String(jid).split(':')[0];
}

function number(jid = '') {
  return cleanJid(jid)
    .split('@')[0]
    .replace(/\D/g, '');
}

function getMsgKey(remoteJid, id) {
  return `${cleanJid(remoteJid)}:${id}`;
}

function uniqueList(list = []) {
  return [...new Set(list.filter(Boolean))];
}

function getSaveKeys(remoteJid, id, sender = '') {
  return uniqueList([
    getMsgKey(remoteJid, id),
    getMsgKey(sender, id),
    String(id)
  ]);
}

function getProtocolMessage(msg) {
  const m = msg.message || {};

  return (
    m.protocolMessage ||
    m.ephemeralMessage?.message?.protocolMessage ||
    m.viewOnceMessage?.message?.protocolMessage ||
    m.viewOnceMessageV2?.message?.protocolMessage ||
    null
  );
}

function isDeleteMessage(msg) {
  const protocol = getProtocolMessage(msg);
  if (!protocol) return false;

  return (
    protocol.type === 0 ||
    protocol.type === 'REVOKE' ||
    protocol.type === 14 ||
    !!protocol.key?.id
  );
}

function getDeletedKey(msg) {
  return getProtocolMessage(msg)?.key || null;
}

function getPossibleDeletedKeys(remoteJid, deletedKey = {}) {
  const id = deletedKey?.id;
  if (!id) return [];

  return uniqueList([
    getMsgKey(remoteJid, id),
    getMsgKey(deletedKey.remoteJid, id),
    getMsgKey(deletedKey.participant, id),
    String(id)
  ]);
}

function findSavedMessage(remoteJid, deletedKey) {
  const keys = getPossibleDeletedKeys(remoteJid, deletedKey);

  for (const key of keys) {
    const saved = deletedCache.get(key);
    if (saved) return { key, saved };
  }

  return null;
}

function unwrapMessage(message = {}) {
  if (message.ephemeralMessage?.message) {
    return unwrapMessage(message.ephemeralMessage.message);
  }

  if (message.documentWithCaptionMessage?.message) {
    return unwrapMessage(message.documentWithCaptionMessage.message);
  }

  if (message.viewOnceMessage?.message) {
    return message;
  }

  if (message.viewOnceMessageV2?.message) {
    return message;
  }

  if (message.viewOnceMessageV2Extension?.message) {
    return message;
  }

  return message;
}

function getContextInfo(message = {}) {
  return (
    message.extendedTextMessage?.contextInfo ||
    message.imageMessage?.contextInfo ||
    message.videoMessage?.contextInfo ||
    message.audioMessage?.contextInfo ||
    message.ptvMessage?.contextInfo ||
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

function isViewOnce(message = {}) {
  return (
    message.viewOnceMessage ||
    message.viewOnceMessageV2 ||
    message.viewOnceMessageV2Extension ||
    message.imageMessage?.viewOnce === true ||
    message.videoMessage?.viewOnce === true
  );
}

function getMediaInfo(message = {}) {
  if (message.imageMessage) {
    return {
      type: 'image',
      mediaType: 'image',
      media: message.imageMessage,
      mimetype: message.imageMessage.mimetype || 'image/jpeg',
      caption: message.imageMessage.caption || '',
      fileName: 'imagen.jpg'
    };
  }

  if (message.videoMessage) {
    return {
      type: message.videoMessage.gifPlayback ? 'gif' : 'video',
      mediaType: 'video',
      media: message.videoMessage,
      mimetype: message.videoMessage.mimetype || 'video/mp4',
      caption: message.videoMessage.caption || '',
      gifPlayback: message.videoMessage.gifPlayback || false,
      fileName: message.videoMessage.gifPlayback ? 'gif.mp4' : 'video.mp4'
    };
  }

  if (message.ptvMessage) {
    return {
      type: 'video',
      mediaType: 'video',
      media: message.ptvMessage,
      mimetype: message.ptvMessage.mimetype || 'video/mp4',
      caption: '',
      gifPlayback: false,
      fileName: 'video_circular.mp4'
    };
  }

  if (message.audioMessage) {
    return {
      type: 'audio',
      mediaType: 'audio',
      media: message.audioMessage,
      mimetype: message.audioMessage.mimetype || 'audio/mpeg',
      ptt: message.audioMessage.ptt || false,
      caption: '',
      fileName: message.audioMessage.ptt ? 'nota_voz.ogg' : 'audio.mp3'
    };
  }

  if (message.stickerMessage) {
    return {
      type: 'sticker',
      mediaType: 'sticker',
      media: message.stickerMessage,
      mimetype: message.stickerMessage.mimetype || 'image/webp',
      caption: '',
      fileName: 'sticker.webp'
    };
  }

  if (message.documentMessage) {
    const mimetype = message.documentMessage.mimetype || 'application/octet-stream';
    const fileName = message.documentMessage.fileName || 'archivo';
    const caption = message.documentMessage.caption || '';
    const lowerName = String(fileName).toLowerCase();

    if (mimetype === 'image/gif' || lowerName.endsWith('.gif')) {
      return {
        type: 'document',
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

async function downloadMediaBuffer(mediaInfo) {
  const stream = await downloadContentFromMessage(
    mediaInfo.media,
    mediaInfo.mediaType
  );

  const buffer = await streamToBuffer(stream);

  if (!buffer || !buffer.length) return null;

  if (buffer.length > MAX_MEDIA_BUFFER) {
    console.log(`⚠️ Antidelete ignoró archivo pesado: ${buffer.length} bytes`);
    return null;
  }

  return buffer;
}

function deleteSaved(cacheKey, saved) {
  try {
    const keys = saved?.cacheKeys?.length ? saved.cacheKeys : [cacheKey];

    for (const key of keys) {
      deletedCache.delete(key);
    }
  } catch {}
}

async function saveMessage(msg, remoteJid, sender, pushName) {
  const id = msg.key?.id;

  if (!id || !msg.message) return;
  if (isDeleteMessage(msg)) return;

  const message = unwrapMessage(msg.message);

  // No guarda archivos de una sola vez
  if (isViewOnce(message)) return;

  const media = getMediaInfo(message);
  const text = getText(message);
  const mentions = getMessageMentions(message);

  let mediaBuffer = null;
  let savedSize = 0;

  if (media) {
    try {
      mediaBuffer = await downloadMediaBuffer(media);

      if (mediaBuffer && mediaBuffer.length) {
        savedSize = mediaBuffer.length;
        console.log(`🕵️ Antidelete guardó en RAM: ${media.type} | ${savedSize} bytes`);
      } else {
        console.log(`⚠️ Antidelete detectó ${media.type}, pero no pudo guardar el archivo.`);
      }
    } catch (err) {
      console.log('⚠️ Antidelete no pudo descargar media:', err?.message || err);
    }
  }

  const cacheKeys = getSaveKeys(remoteJid, id, sender);

  const savedData = {
    remoteJid,
    sender: cleanJid(sender),
    pushName: pushName || 'Usuario',
    message,
    text,
    mentions,
    media,
    mediaBuffer,
    savedSize,
    cacheKeys,
    time: Date.now()
  };

  for (const key of cacheKeys) {
    deletedCache.set(key, savedData);
  }

  if (deletedCache.size > MAX_CACHE) {
    const firstKey = deletedCache.keys().next().value;
    const firstSaved = deletedCache.get(firstKey);
    deleteSaved(firstKey, firstSaved);
  }
}

function cleanOldCache() {
  const now = Date.now();
  const seen = new Set();

  for (const [key, value] of deletedCache.entries()) {
    if (!value || seen.has(value)) continue;

    seen.add(value);

    if (now - value.time > CACHE_TIME) {
      deleteSaved(key, value);
    }
  }
}

async function isEnabled(db, remoteJid, fromGroup) {
  try {
    if (!fromGroup) return true;

    const value = await db.getGroupSetting(remoteJid, 'antidelete');
    return value === true;
  } catch {
    return !fromGroup;
  }
}

function buildCaption(user, mediaCaption = '') {
  return `🕵️ *MENSAJE ELIMINADO*

👤 Usuario: @${number(user)}${mediaCaption ? `\n\n💬 Descripción:\n${mediaCaption}` : ''}`;
}

async function sendSavedMedia(sock, remoteJid, saved, mentions) {
  const media = saved.media;
  const buffer = saved.mediaBuffer;

  if (!media || !buffer || !buffer.length) {
    return false;
  }

  const caption = buildCaption(
    saved.sender,
    media.caption || saved.text || ''
  );

  if (media.type === 'image') {
    await sock.sendMessage(remoteJid, {
      image: buffer,
      mimetype: media.mimetype,
      caption,
      mentions
    });

    return true;
  }

  if (media.type === 'video' || media.type === 'gif') {
    await sock.sendMessage(remoteJid, {
      video: buffer,
      mimetype: media.mimetype || 'video/mp4',
      gifPlayback: media.gifPlayback || false,
      caption,
      mentions
    });

    return true;
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

    return true;
  }

  if (media.type === 'sticker') {
    await sock.sendMessage(remoteJid, {
      sticker: buffer
    });

    await sock.sendMessage(remoteJid, {
      text: caption,
      mentions
    });

    return true;
  }

  if (media.type === 'document') {
    await sock.sendMessage(remoteJid, {
      document: buffer,
      mimetype: media.mimetype,
      fileName: media.fileName || 'archivo',
      caption,
      mentions
    });

    return true;
  }

  return false;
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
      db
    } = ctx;

    try {
      cleanOldCache();

      // Guarda todo apenas llega
      if (!isDeleteMessage(msg)) {
        await saveMessage(msg, remoteJid, sender, pushName);
        return;
      }

      const enabled = await isEnabled(db, remoteJid, fromGroup);
      if (!enabled) return;

      const deletedKey = getDeletedKey(msg);
      const found = findSavedMessage(remoteJid, deletedKey);

      if (!found) return;

      const { key: cacheKey, saved } = found;

      const user = saved.sender;
      const text = saved.text || getText(saved.message);

      const mentions = uniqueMentions([
        user,
        ...(saved.mentions || [])
      ]);

      if (saved.media) {
        const sent = await sendSavedMedia(sock, remoteJid, saved, mentions);

        if (sent) {
          deleteSaved(cacheKey, saved);
          return;
        }

        await sock.sendMessage(remoteJid, {
          text:
`🕵️ *MENSAJE ELIMINADO*

👤 Usuario: @${number(user)}

⚠️ El mensaje tenía un archivo, pero no se pudo reenviar desde la memoria.${text ? `\n\n💬 Texto:\n${text}` : ''}`,
          mentions
        });

        deleteSaved(cacheKey, saved);
        return;
      }

      if (!text) {
        deleteSaved(cacheKey, saved);
        return;
      }

      await sock.sendMessage(remoteJid, {
        text:
`🕵️ *MENSAJE ELIMINADO*

👤 Usuario: @${number(user)}

💬 Mensaje:
${text}`,
        mentions
      });

      deleteSaved(cacheKey, saved);

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
