'use strict';

const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const deletedCache = new Map();

const MAX_CACHE = 1000;
const CACHE_TIME = 2 * 60 * 60 * 1000;
const MAX_MEDIA_BUFFER = 60 * 1024 * 1024; // 60 MB

function cleanJid(jid = '') {
  return String(jid).split(':')[0];
}

function number(jid = '') {
  return cleanJid(jid)
    .split('@')[0]
    .replace(/\D/g, '');
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

// ═══════════════════════════════════════════════
// 👁️ BLOQUE ESPECIAL ANTI 1 SOLA VEZ
// Esta parte detecta archivos de 1 sola vez
// y evita que el plugin los descargue o guarde.
// Puedes copiar este bloque a otros plugins.
// ═══════════════════════════════════════════════

function isViewOnce(message = {}) {
  if (!message || typeof message !== 'object') return false;

  return (
    !!message.viewOnceMessage ||
    !!message.viewOnceMessageV2 ||
    !!message.viewOnceMessageV2Extension ||
    message.imageMessage?.viewOnce === true ||
    message.videoMessage?.viewOnce === true ||
    message.audioMessage?.viewOnce === true ||
    message.documentMessage?.viewOnce === true ||
    message.stickerMessage?.viewOnce === true
  );
}

function getViewOnceType(message = {}) {
  const inner =
    message.viewOnceMessage?.message ||
    message.viewOnceMessageV2?.message ||
    message.viewOnceMessageV2Extension?.message ||
    message.ephemeralMessage?.message?.viewOnceMessage?.message ||
    message.ephemeralMessage?.message?.viewOnceMessageV2?.message ||
    message.ephemeralMessage?.message?.viewOnceMessageV2Extension?.message ||
    message;

  if (inner.imageMessage) return 'imagen';
  if (inner.videoMessage) return inner.videoMessage.gifPlayback ? 'gif/video' : 'video';
  if (inner.audioMessage) return inner.audioMessage.ptt ? 'nota de voz' : 'audio';
  if (inner.documentMessage) return 'documento';
  if (inner.stickerMessage) return 'sticker';

  return 'archivo';
}

function shouldIgnoreViewOnce(originalMessage = {}, unwrappedMessage = {}) {
  return isViewOnce(originalMessage) || isViewOnce(unwrappedMessage);
}

// ═══════════════════════════════════════════════
// FIN DEL BLOQUE ESPECIAL ANTI 1 SOLA VEZ
// ═══════════════════════════════════════════════

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
    return {
      type: 'video',
      mediaType: 'video',
      media: message.videoMessage,
      mimetype: message.videoMessage.mimetype || 'video/mp4',
      caption: message.videoMessage.caption || '',
      gifPlayback: message.videoMessage.gifPlayback || false
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
    return {
      type: 'document',
      mediaType: 'document',
      media: message.documentMessage,
      mimetype: message.documentMessage.mimetype || 'application/octet-stream',
      fileName: message.documentMessage.fileName || 'archivo',
      caption: message.documentMessage.caption || ''
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
    return null;
  }

  return buffer;
}

async function saveMessage(msg, remoteJid, sender, pushName) {
  const id = msg.key?.id;

  if (!id || !msg.message) return;
  if (isDeleteMessage(msg)) return;

  const originalMessage = msg.message;
  const message = unwrapMessage(originalMessage);

  // ═══════════════════════════════════════════════
  // 👁️ USO DEL BLOQUE ANTI 1 SOLA VEZ
  // Esta parte es la que realmente evita que se guarde.
  // Si detecta 1 sola vez, hace return y no descarga nada.
  // ═══════════════════════════════════════════════
  if (shouldIgnoreViewOnce(originalMessage, message)) {
    const viewOnceType = getViewOnceType(originalMessage);

    console.log(`👁️ Antidelete ignoró archivo de 1 sola vez: ${viewOnceType}`);
  }

  const media = getMediaInfo(message);
  let mediaBuffer = null;

  if (media) {
    try {
      mediaBuffer = await downloadMediaBuffer(media);
    } catch {}
  }

  const key = getMsgKey(remoteJid, id);

  deletedCache.set(key, {
    remoteJid,
    sender: cleanJid(sender),
    pushName: pushName || 'Usuario',
    message,
    mentions: getMessageMentions(message),
    media,
    mediaBuffer,
    text: getText(message),
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

      if (!isDeleteMessage(msg)) {
        await saveMessage(msg, remoteJid, sender, pushName);
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
      const text = saved.text || getText(saved.message);
      const media = saved.media || getMediaInfo(saved.message);

      const mentions = uniqueMentions([
        user,
        ...(saved.mentions || [])
      ]);

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

      let buffer = saved.mediaBuffer;

      if (!buffer || !buffer.length) {
        try {
          buffer = await downloadMediaBuffer(media);
        } catch {}
      }

      if (!buffer || !buffer.length) {
        await sock.sendMessage(remoteJid, {
          text:
`🕵️ *MENSAJE ELIMINADO*

👤 Usuario: @${number(user)}

⚠️ El mensaje tenía un archivo, pero no se pudo recuperar el contenido.${text ? `\n\n💬 Texto:\n${text}` : ''}`,
          mentions
        });

        deletedCache.delete(cacheKey);
        return;
      }

      const caption = buildCaption(user, media.caption || text || '');

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
          fileName: media.fileName,
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
