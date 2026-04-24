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

    const text = args.join(' ') || '📢 Atención';

    try {
      const metadata = await sock.groupMetadata(remoteJid);
      const participants = metadata.participants;

      const users = participants.map(p => p.id);

      // 🔥 INVISIBLE (TRUCO)
      const invisible = String.fromCharCode(8206).repeat(1000);

      const content = {
        extendedTextMessage: {
          text: `${invisible}\n📢 *NOTIFICACIÓN*\n\n${text}`,
          contextInfo: {
            mentionedJid: users,
            forwardingScore: 999,
            isForwarded: true
          }
        }
      };

      // 🔥 GENERAR MENSAJE CORRECTO
      const msgGen = generateWAMessageFromContent(
        remoteJid,
        content,
        {
          userJid: sock.user.id,
          quoted: msg
        }
      );

      // 🔥 ENVIAR BIEN
      await sock.relayMessage(
        remoteJid,
        msgGen.message,
        { messageId: msgGen.key.id }
      );

    } catch (e) {
      console.log('ERROR PRINCIPAL:', e);

      // 🔥 FALLBACK (SI FALLA)
      try {
        const metadata = await sock.groupMetadata(remoteJid);
        const users = metadata.participants.map(p => p.id);

        await sock.sendMessage(remoteJid, {
          text: `📢 ${text}`,
          mentions: users
        }, { quoted: msg });

      } catch (err) {
        console.log('ERROR FALLBACK:', err);

        await sock.sendMessage(remoteJid, {
          text: '❌ Error al notificar'
        }, { quoted: msg });
      }
    }
  }
};
