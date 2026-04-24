'use strict';

const db = require('../lib/database');

module.exports = {
  commands: ['addprem', 'delprem', 'prem'],

  async execute(ctx) {
    const { sock, msg, remoteJid, args, isOwner, command } = ctx;

    if (!isOwner) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Solo el owner'
      }, { quoted: msg });
    }

    const target =
      msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
      args[0];

    if (!target) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Menciona o escribe número'
      }, { quoted: msg });
    }

    const user = target.includes('@')
      ? target
      : target + '@s.whatsapp.net';

    if (command === 'addprem') {
      const days = parseInt(args[1]);

      if (!days) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Ejemplo: .addprem @user 7'
        }, { quoted: msg });
      }

      await db.addPremium(user, days);

      return sock.sendMessage(remoteJid, {
        text: `✅ Premium activado por ${days} días`
      }, { quoted: msg });
    }

    if (command === 'delprem') {
      await db.removePremium(user);

      return sock.sendMessage(remoteJid, {
        text: '❌ Premium eliminado'
      }, { quoted: msg });
    }

    if (command === 'prem') {
      const time = await db.getPremiumTime(user);

      if (time <= 0) {
        return sock.sendMessage(remoteJid, {
          text: '❌ No es premium'
        }, { quoted: msg });
      }

      const days = Math.floor(time / (1000 * 60 * 60 * 24));

      return sock.sendMessage(remoteJid, {
        text: `⭐ Premium activo\n⏳ ${days} días restantes`
      }, { quoted: msg });
    }
  }
};
