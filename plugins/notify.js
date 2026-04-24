'use strict';

const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const db = require('../lib/database');

module.exports = {
  commands: ['notify', 'hidetag', 'notificar'],

  async execute(ctx) {
    const { sock, msg, remoteJid, args, isOwner, isAdmin, isPremium, sender } = ctx;

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

    // 🔥 PERMISOS
    if (!(isAdmin || isPremium || isOwner)) {

      const allowed = await db.canUseNotify(sender);

      if (!allowed) {
        const left = await db.getRemainingUses(sender);

        return sock.sendMessage(remoteJid, {
          text: `❌ Límite alcanzado (5 diarios)\n🔒 Hazte premium para uso ilimitado`
        }, { quoted: msg });
      }

      const left = await db.getRemainingUses(sender);

      await sock.sendMessage(remoteJid, {
        text: `⚠️ Uso gratis restante: ${left}/5`
      }, { quoted: msg });
    }

    try {
      const metadata = await sock.groupMetadata(remoteJid);
      const users = metadata.participants.map(p => p.id);

      // 🔥 INVISIBLE SIN "LEER MÁS"
      const invisible = String.fromCharCode(8206).repeat(30);

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
      console.log(e);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error al enviar'
      }, { quoted: msg });
    }
  }
};
