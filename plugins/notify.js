'use strict';

const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');

module.exports = {
  commands: ['notify', 'hidetag', 'notificar'],

  async execute(ctx) {
    const { sock, msg, remoteJid, args, isOwner, isAdmin } = ctx;

    if (!(isAdmin || isOwner)) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Solo admins pueden usar esto'
      }, { quoted: msg });
    }

    if (!remoteJid.endsWith('@g.us')) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Solo en grupos'
      }, { quoted: msg });
    }

    const text = args.join(' ');
    if (!text) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Escribe un mensaje'
      }, { quoted: msg });
    }

    try {
      const metadata = await sock.groupMetadata(remoteJid);
      const users = metadata.participants.map(p => p.id);

      // 🔥 INVISIBLE REDUCIDO (SIN "LEER MÁS")
      const invisible = String.fromCharCode(8206).repeat(50);

      const content = {
        extendedTextMessage: {
          text: invisible + text,
          contextInfo: {
            mentionedJid: users
          }
        }
      };

      const msgGen = generateWAMessageFromContent(
        remoteJid,
        content,
        {
          userJid: sock.user.id,
          quoted: msg
        }
      );

      await sock.relayMessage(
        remoteJid,
        msgGen.message,
        { messageId: msgGen.key.id }
      );

    } catch (e) {
      console.log('ERROR:', e);

      // fallback
      try {
        const metadata = await sock.groupMetadata(remoteJid);
        const users = metadata.participants.map(p => p.id);

        await sock.sendMessage(remoteJid, {
          text,
          mentions: users
        }, { quoted: msg });

      } catch {
        await sock.sendMessage(remoteJid, {
          text: '❌ Error al enviar'
        }, { quoted: msg });
      }
    }
  }
};
