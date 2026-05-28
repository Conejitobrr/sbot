'use strict';

const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const config = require('../config');

const COSTO_VER = 10000;
const PENDING_TIME = 60 * 1000;

const pendingVer = new Map();

async function streamToBuffer(stream) {
  let buffer = Buffer.from([]);

  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk]);
  }

  return buffer;
}

function cleanJid(jid = '') {
  return String(jid).split(':')[0];
}

function cleanNumber(jid = '') {
  return cleanJid(jid)
    .split('@')[0]
    .replace(/\D/g, '');
}

function isOwnerUser(jid = '') {
  const number = cleanNumber(jid);

  const owners = Array.isArray(config.owner)
    ? config.owner.map(n => String(n).replace(/\D/g, ''))
    : [];

  return owners.includes(number);
}

function isPremiumUser(user = {}) {
  return (
    user?.premium === true ||
    user?.isPremium === true ||
    Number(user?.premiumUntil || 0) > Date.now()
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

function getQuotedMessage(msg) {
  const ctx = getQuotedContext(msg);
  const quoted = ctx?.quotedMessage || null;

  return quoted ? unwrapMessage(quoted) : null;
}

function getQuotedWAMessage(msg, remoteJid) {
  const ctx = getQuotedContext(msg);

  if (!ctx?.quotedMessage || !ctx?.stanzaId) return msg;

  return {
    key: {
      remoteJid,
      id: ctx.stanzaId,
      participant: ctx.participant,
      fromMe: false
    },
    message: ctx.quotedMessage
  };
}

function getMediaInfo(message = {}) {
  if (message.imageMessage) {
    return {
      type: 'image',
      mediaType: 'image',
      media: message.imageMessage,
      mimetype: message.imageMessage.mimetype || 'image/jpeg'
    };
  }

  if (message.videoMessage) {
    return {
      type: 'video',
      mediaType: 'video',
      media: message.videoMessage,
      mimetype: message.videoMessage.mimetype || 'video/mp4'
    };
  }

  if (message.audioMessage) {
    return {
      type: 'audio',
      mediaType: 'audio',
      media: message.audioMessage,
      mimetype: message.audioMessage.mimetype || 'audio/mpeg',
      ptt: message.audioMessage.ptt || false
    };
  }

  if (message.documentMessage) {
    const mimetype = message.documentMessage.mimetype || '';
    const fileName = message.documentMessage.fileName || 'archivo';

    if (mimetype.startsWith('image/')) {
      return {
        type: 'image',
        mediaType: 'document',
        media: message.documentMessage,
        mimetype,
        fileName
      };
    }

    if (mimetype.startsWith('video/')) {
      return {
        type: 'video',
        mediaType: 'document',
        media: message.documentMessage,
        mimetype,
        fileName
      };
    }

    if (mimetype.startsWith('audio/')) {
      return {
        type: 'audio',
        mediaType: 'document',
        media: message.documentMessage,
        mimetype,
        fileName,
        ptt: false
      };
    }
  }

  return null;
}

async function sendMedia(sock, remoteJid, mediaInfo, quotedOriginal) {
  const stream = await downloadContentFromMessage(
    mediaInfo.media,
    mediaInfo.mediaType
  );

  const buffer = await streamToBuffer(stream);

  if (!buffer || !buffer.length) {
    throw new Error('No se pudo descargar el archivo.');
  }

  if (mediaInfo.type === 'image') {
    return sock.sendMessage(remoteJid, {
      image: buffer,
      mimetype: mediaInfo.mimetype
    }, { quoted: quotedOriginal });
  }

  if (mediaInfo.type === 'video') {
    return sock.sendMessage(remoteJid, {
      video: buffer,
      mimetype: mediaInfo.mimetype
    }, { quoted: quotedOriginal });
  }

  if (mediaInfo.type === 'audio') {
    return sock.sendMessage(remoteJid, {
      audio: buffer,
      mimetype: mediaInfo.mimetype,
      ptt: mediaInfo.ptt || false
    }, { quoted: quotedOriginal });
  }
}

module.exports = {
  commands: ['ver'],

  async execute({ sock, remoteJid, msg, sender, args, db, isOwner }) {
    let charged = false;

    try {
      const userKey = cleanJid(sender);
      const option = (args?.[0] || '').toLowerCase();

      if (['cancelar', 'cancel', 'no'].includes(option)) {
        pendingVer.delete(userKey);

        return sock.sendMessage(remoteJid, {
          text: '✅ Canje cancelado. No se descontó XP.'
        }, { quoted: msg });
      }

      if (['aceptar', 'confirmar', 'si', 'sí'].includes(option)) {
        const pending = pendingVer.get(userKey);

        if (!pending) {
          return sock.sendMessage(remoteJid, {
            text:
`❌ No tienes ningún canje pendiente.

Responde a una imagen, video o audio y usa:
.ver`
          }, { quoted: msg });
        }

        if (Date.now() > pending.expiresAt) {
          pendingVer.delete(userKey);

          return sock.sendMessage(remoteJid, {
            text: '⏳ El canje expiró. Vuelve a usar *.ver*.'
          }, { quoted: msg });
        }

        const user = await db.getUser(userKey);
        const xp = Number(user.xp || 0);

        if (xp < COSTO_VER) {
          pendingVer.delete(userKey);

          return sock.sendMessage(remoteJid, {
            text:
`❌ Ya no tienes suficiente XP.

💰 Costo: *${COSTO_VER} XP*
⭐ Tu XP actual: *${xp} XP*`
          }, { quoted: msg });
        }

        await db.removeXP(userKey, COSTO_VER);
        charged = true;

        await sendMedia(
          sock,
          pending.remoteJid,
          pending.mediaInfo,
          pending.quotedOriginal
        );

        pendingVer.delete(userKey);

        return;
      }

      const quoted = getQuotedMessage(msg);
      const quotedOriginal = getQuotedWAMessage(msg, remoteJid);

      if (!quoted) {
        return sock.sendMessage(remoteJid, {
          text:
`❌ Responde a una imagen, video o audio.

Ejemplo:
Responde al archivo y escribe *.ver*

💰 Costo usuarios normales: *${COSTO_VER} XP*
👑 Owner y premium: gratis`
        }, { quoted: msg });
      }

      const mediaInfo = getMediaInfo(quoted);

      if (!mediaInfo) {
        return sock.sendMessage(remoteJid, {
          text: '❌ El mensaje citado no es imagen, video ni audio.'
        }, { quoted: msg });
      }

      const user = await db.getUser(userKey);
      const premium = isPremiumUser(user);
      const owner = isOwner || isOwnerUser(userKey);

      if (owner || premium) {
        return sendMedia(sock, remoteJid, mediaInfo, quotedOriginal);
      }

      const xp = Number(user.xp || 0);

      if (xp < COSTO_VER) {
        return sock.sendMessage(remoteJid, {
          text:
`❌ No tienes suficiente XP para usar *.ver*.

💰 Costo: *${COSTO_VER} XP*
⭐ Tu XP actual: *${xp} XP*
📌 Te faltan: *${COSTO_VER - xp} XP*

👑 Premium y owner lo usan gratis.`
        }, { quoted: msg });
      }

      pendingVer.set(userKey, {
        remoteJid,
        mediaInfo,
        quotedOriginal,
        expiresAt: Date.now() + PENDING_TIME
      });

      return sock.sendMessage(remoteJid, {
        text:
`⚠️ *Confirmar canje*

Usar *.ver* cuesta *${COSTO_VER} XP*.

⭐ Tu XP actual: *${xp} XP*
⭐ Te quedaría: *${xp - COSTO_VER} XP*

Para confirmar escribe:
*.ver aceptar*

Para cancelar:
*.ver cancelar*

⏳ Este canje vence en 60 segundos.`
      }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error en ver:', err?.message || err);

      if (charged) {
        try {
          await db.addXP(cleanJid(sender), COSTO_VER);
        } catch {}
      }

      return sock.sendMessage(remoteJid, {
        text: charged
          ? '❌ Error reenviando el archivo.\n\n💰 Se devolvieron tus 10000 XP.'
          : '❌ Error reenviando el archivo.'
      }, { quoted: msg });
    }
  }
};
