'use strict';

const db = require('../lib/database');

function normalizeUser(target = '') {
  const clean = String(target).replace(/\D/g, '');
  if (!clean) return null;
  return clean + '@s.whatsapp.net';
}

module.exports = {
  commands: ['addprem', 'delprem', 'prem'],

  async execute(ctx) {
    const { sock, msg, remoteJid, args, isOwner, command, sender } = ctx;

    if (!isOwner) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Solo el owner puede usar este comando.'
      }, { quoted: msg });
    }

    const mentioned =
      msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

    const target = mentioned || args[0] || sender;
    const user = target.includes('@') ? target : normalizeUser(target);

    if (!user) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Menciona o escribe un número.'
      }, { quoted: msg });
    }

    if (command === 'addprem') {
      const days = parseInt(args[1]);

      if (!days || days <= 0) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Ejemplo: .addprem @user 7'
        }, { quoted: msg });
      }

      await db.addPremium(user, days);

      return sock.sendMessage(remoteJid, {
        text: `✅ Premium activado por ${days} días.`
      }, { quoted: msg });
    }

    if (command === 'delprem') {
      await db.removePremium(user);

      return sock.sendMessage(remoteJid, {
        text: '✅ Premium eliminado.'
      }, { quoted: msg });
    }

    if (command === 'prem') {
      const time = await db.getPremiumTime(user);

      if (time <= 0) {
        return sock.sendMessage(remoteJid, {
          text: '❌ No es premium.'
        }, { quoted: msg });
      }

      const days = Math.ceil(time / (1000 * 60 * 60 * 24));

      return sock.sendMessage(remoteJid, {
        text: `⭐ Premium activo\n⏳ ${days} días restantes.`
      }, { quoted: msg });
    }
  }
};
