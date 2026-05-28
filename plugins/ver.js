'use strict';

const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

async function streamToBuffer(stream) {
  let buffer = Buffer.from([]);

  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk]);
  }

  return buffer;
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
  const quoted =
    msg.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
    msg.message?.imageMessage?.contextInfo?.quotedMessage ||
    msg.message?.videoMessage?.contextInfo?.quotedMessage ||
    msg.message?.audioMessage?.contextInfo?.quotedMessage ||
    null;

  return quoted ? unwrapMessage(quoted) : null;
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

module.exports = {
  commands: ['ver'],

  async execute({ sock, remoteJid, msg }) {
    try {
      const quoted = getQuotedMessage(msg);

      if (!quoted) {
        return sock.sendMessage(remoteJid, {
          text:
`❌ Responde a una imagen, video o audio.

Ejemplo:
Responde al archivo y escribe *.ver*`
        }, { quoted: msg });
      }

      const mediaInfo = getMediaInfo(quoted);

      if (!mediaInfo) {
        return sock.sendMessage(remoteJid, {
          text: '❌ El mensaje citado no es imagen, video ni audio.'
        }, { quoted: msg });
      }

      const stream = await downloadContentFromMessage(
        mediaInfo.media,
        mediaInfo.mediaType
      );

      const buffer = await streamToBuffer(stream);

      if (!buffer || !buffer.length) {
        return sock.sendMessage(remoteJid, {
          text: '❌ No se pudo descargar el archivo.'
        }, { quoted: msg });
      }

      // 📷 Reenviar imagen limpia, sin citar y sin descripción
      if (mediaInfo.type === 'image') {
        return sock.sendMessage(remoteJid, {
          image: buffer,
          mimetype: mediaInfo.mimetype
        });
      }

      // 🎥 Reenviar video limpio, sin citar y sin descripción
      if (mediaInfo.type === 'video') {
        return sock.sendMessage(remoteJid, {
          video: buffer,
          mimetype: mediaInfo.mimetype
        });
      }

      // 🎧 Reenviar audio limpio, sin citar
      if (mediaInfo.type === 'audio') {
        return sock.sendMessage(remoteJid, {
          audio: buffer,
          mimetype: mediaInfo.mimetype,
          ptt: mediaInfo.ptt || false
        });
      }

    } catch (err) {
      console.log('❌ Error en ver:', err?.message || err);

      return sock.sendMessage(remoteJid, {
        text: '❌ Error reenviando el archivo.'
      }, { quoted: msg });
    }
  }
};
