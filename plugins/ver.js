'use strict';

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const config = require('../config');

const execFileAsync = promisify(execFile);

const COSTO_VER = 10000;
const PENDING_TIME = 60 * 1000;
const TEMP_DIR = path.join(process.cwd(), 'temp');

const pendingVer = new Map();

function ensureTemp() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

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
      caption: message.videoMessage.caption || ''
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

  if (message.documentMessage) {
    const mimetype = message.documentMessage.mimetype || '';
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
        caption
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
  }

  return null;
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

async function sendMedia(sock, remoteJid, mediaInfo, quotedOriginal) {
  let tempInput = null;
  let tempOutput = null;

  try {
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
        mimetype: mediaInfo.mimetype,
        caption: mediaInfo.caption || ''
      }, { quoted: quotedOriginal });
    }

    if (mediaInfo.type === 'video') {
      return sock.sendMessage(remoteJid, {
        video: buffer,
        mimetype: mediaInfo.mimetype,
        caption: mediaInfo.caption || ''
      }, { quoted: quotedOriginal });
    }

    if (mediaInfo.type === 'gif') {
      return sock.sendMessage(remoteJid, {
        video: buffer,
        mimetype: 'video/mp4',
        gifPlayback: true,
        caption: mediaInfo.caption || ''
      }, { quoted: quotedOriginal });
    }

    if (mediaInfo.type === 'gif_file') {
      ensureTemp();

      const id = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;
      tempInput = path.join(TEMP_DIR, `ver_gif_${id}.gif`);
      tempOutput = path.join(TEMP_DIR, `ver_gif_${id}.mp4`);

      fs.writeFileSync(tempInput, buffer);

      await convertGifToMp4(tempInput, tempOutput);

      const mp4Buffer = fs.readFileSync(tempOutput);

      return sock.sendMessage(remoteJid, {
        video: mp4Buffer,
        mimetype: 'video/mp4',
        gifPlayback: true,
        caption: mediaInfo.caption || ''
      }, { quoted: quotedOriginal });
    }

    if (mediaInfo.type === 'audio') {
      await sock.sendMessage(remoteJid, {
        audio: buffer,
        mimetype: mediaInfo.mimetype,
        ptt: mediaInfo.ptt || false
      }, { quoted: quotedOriginal });

      if (mediaInfo.caption) {
        return sock.sendMessage(remoteJid, {
          text: mediaInfo.caption
        }, { quoted: quotedOriginal });
      }

      return;
    }

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

module.exports = {
  commands: ['ver'],

  async execute({ sock, remoteJid, msg, sender, args, db, isOwner }) {
    let charged = false;

    try {
      const userKey = cleanJid(sender);
      const option = (args?.[0] || '').toLowerCase();

      const user = await db.getUser(userKey);
      const xp = Number(user.xp || 0);
      const premium = isPremiumUser(user);
      const owner = isOwner || isOwnerUser(userKey);

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
`❌ No tienes ningún uso pendiente de *.ver*.

Para canjear 1 uso, responde a una imagen, video, audio o gif y escribe:
*.ver*

💰 Costo para usuarios normales: *${COSTO_VER} XP*
👑 Premium y owner: gratis`
          }, { quoted: msg });
        }

        if (Date.now() > pending.expiresAt) {
          pendingVer.delete(userKey);

          return sock.sendMessage(remoteJid, {
            text: '⏳ El canje expiró. Vuelve a responder al archivo y usa *.ver*.'
          }, { quoted: msg });
        }

        const freshUser = await db.getUser(userKey);
        const freshXp = Number(freshUser.xp || 0);

        if (freshXp < COSTO_VER) {
          pendingVer.delete(userKey);

          return sock.sendMessage(remoteJid, {
            text:
`❌ No tienes suficiente XP para canjear *.ver*.

💰 Costo: *${COSTO_VER} XP*
⭐ Tu XP actual: *${freshXp} XP*
📌 Te faltan: *${COSTO_VER - freshXp} XP*

Usa más el bot, reclama recompensas, participa en eventos o sube de nivel para juntar XP.`
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
        if (owner || premium) {
          return sock.sendMessage(remoteJid, {
            text:
`❌ Responde a una imagen, video, audio o gif.

Ejemplo:
Responde al archivo y escribe *.ver*

👑 Para ti es gratis.`
          }, { quoted: msg });
        }

        if (xp < COSTO_VER) {
          return sock.sendMessage(remoteJid, {
            text:
`❌ No tienes ningún uso canjeado de *.ver*.

💰 Necesitas *${COSTO_VER} XP* para canjear 1 uso.
⭐ Tu XP actual: *${xp} XP*
📌 Te faltan: *${COSTO_VER - xp} XP*

Usa más el bot, participa en eventos, reclama XP o sube de nivel para poder canjearlo.`
          }, { quoted: msg });
        }

        return sock.sendMessage(remoteJid, {
          text:
`ℹ️ No tienes ningún uso pendiente de *.ver*.

✅ Tienes XP suficiente para canjear 1 uso.

💰 Costo: *${COSTO_VER} XP*
⭐ Tu XP actual: *${xp} XP*

Para canjearlo:
1. Responde a una imagen, video, audio o gif.
2. Escribe *.ver*
3. Confirma con *.ver aceptar*`
        }, { quoted: msg });
      }

      const mediaInfo = getMediaInfo(quoted);

      if (!mediaInfo) {
        return sock.sendMessage(remoteJid, {
          text: '❌ El mensaje citado no es imagen, video, audio ni gif.'
        }, { quoted: msg });
      }

      if (owner || premium) {
        return sendMedia(sock, remoteJid, mediaInfo, quotedOriginal);
      }

      if (xp < COSTO_VER) {
        return sock.sendMessage(remoteJid, {
          text:
`❌ No tienes suficiente XP para usar *.ver*.

💰 Costo: *${COSTO_VER} XP*
⭐ Tu XP actual: *${xp} XP*
📌 Te faltan: *${COSTO_VER - xp} XP*

Usa más el bot, participa en eventos, reclama XP o sube de nivel para poder canjear 1 uso.`
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

Vas a gastar *${COSTO_VER} XP* para usar *.ver* una vez.

⭐ Tu XP actual: *${xp} XP*
⭐ Te quedaría: *${xp - COSTO_VER} XP*

Para confirmar:
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
