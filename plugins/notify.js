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

    // 🔥 PERMISOS (FIX)
    if (!(isAdmin || isPremium || isOwner)) {

      // 👇 ahora usa tu función real del database
      const allowed = await db.canUseNotify(remoteJid, true);

      if (!allowed) {
        return sock.sendMessage(remoteJid, {
          text: `❌ El bot está desactivado en este grupo`
        }, { quoted: msg });
      }
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
      console.log('❌ Error notify:', e?.stack || e);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error al enviar'
      }, { quoted: msg });
    }
  }
};
