'use strict';

const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

async function streamToBuffer(stream) {
  let buffer = Buffer.from([]);

  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk]);
  }

  return buffer;
}

function getQuotedMessage(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
}

function isViewOnce(message = {}) {
  return (
    message.viewOnceMessage ||
    message.viewOnceMessageV2 ||
    message.viewOnceMessageV2Extension ||
    message.imageMessage?.viewOnce === true ||
    message.videoMessage?.viewOnce === true ||
    message.audioMessage?.viewOnce === true
  );
}

function getMediaMessage(message = {}) {
  if (message.imageMessage) {
    return {
      type: 'image',
      media: message.imageMessage,
      mimetype: message.imageMessage.mimetype || 'image/jpeg',
      caption: message.imageMessage.caption || ''
    };
  }

  if (message.videoMessage) {
    return {
      type: 'video',
      media: message.videoMessage,
      mimetype: message.videoMessage.mimetype || 'video/mp4',
      caption: message.videoMessage.caption || ''
    };
  }

  if (message.audioMessage) {
    return {
      type: 'audio',
      media: message.audioMessage,
      mimetype: message.audioMessage.mimetype || 'audio/mpeg',
      ptt: message.audioMessage.ptt || false
    };
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
`❌ Responde a una foto, video o audio.

Ejemplo:
Responde al mensaje y escribe *.ver*`
        }, { quoted: msg });
      }

      if (isViewOnce(quoted)) {
        return sock.sendMessage(remoteJid, {
          text:
`🔒 No puedo reenviar contenido de *ver una sola vez*.

Pídele a la persona que lo envíe como foto, video o audio normal.`
        }, { quoted: msg });
      }

      const mediaData = getMediaMessage(quoted);

      if (!mediaData) {
        return sock.sendMessage(remoteJid, {
          text: '❌ El mensaje citado no contiene foto, video ni audio normal.'
        }, { quoted: msg });
      }

      const stream = await downloadContentFromMessage(
        mediaData.media,
        mediaData.type
      );

      const buffer = await streamToBuffer(stream);

      if (mediaData.type === 'image') {
        return sock.sendMessage(remoteJid, {
          image: buffer,
          mimetype: mediaData.mimetype,
          caption: mediaData.caption || ''
        });
      }

      if (mediaData.type === 'video') {
        return sock.sendMessage(remoteJid, {
          video: buffer,
          mimetype: mediaData.mimetype,
          caption: mediaData.caption || ''
        });
      }

      if (mediaData.type === 'audio') {
        return sock.sendMessage(remoteJid, {
          audio: buffer,
          mimetype: mediaData.mimetype,
          ptt: mediaData.ptt
        });
      }

    } catch (err) {
      console.log('❌ Error en ver:', err?.message || err);

      return sock.sendMessage(remoteJid, {
        text: '❌ Error al procesar el archivo.'
      }, { quoted: msg });
    }
  }
};
