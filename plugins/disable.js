'use strict';

const db = require('../lib/database');

const FEATURES = [
  'bot',
  'audios',
  'welcome',
  'antilink',
  'antispam'
];

module.exports = {
  commands: ['disable'],

  async execute(ctx) {
    const {
      sock,
      msg,
      remoteJid,
      sender,
      args,
      fromGroup,
      isAdmin,
      isOwner
    } = ctx;

    const feature = (args[0] || '').toLowerCase();

    if (!feature) {
      return sock.sendMessage(remoteJid, {
        text:
`📌 Uso del comando:

.disable bot
.disable welcome
.disable audios

📋 Funciones disponibles:
${FEATURES.map(f => `➤ ${f}`).join('\n')}`
      }, { quoted: msg });
    }

    if (!FEATURES.includes(feature)) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Función no válida.\nUsa *.disable* para ver opciones.'
      }, { quoted: msg });
    }

    if (feature === 'bot' || feature === 'audios') {
      if (fromGroup) {
        if (!isAdmin && !isOwner) {
          return sock.sendMessage(remoteJid, {
            text: '❌ Solo admins/owner pueden usar este comando.'
          }, { quoted: msg });
        }

        await db.setGroupSetting(remoteJid, feature, false);
      } else {
        await db.setUserSetting(sender, feature, false);
      }

      return sock.sendMessage(remoteJid, {
        text: `✅ *${feature}* desactivado correctamente.`
      }, { quoted: msg });
    }

    if (!fromGroup) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Este comando solo funciona en grupos.'
      }, { quoted: msg });
    }

    if (!isAdmin && !isOwner) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Solo admins pueden usar este comando.'
      }, { quoted: msg });
    }

    await db.setGroupSetting(remoteJid, feature, false);

    return sock.sendMessage(remoteJid, {
      text: `✅ *${feature}* desactivado correctamente.`
    }, { quoted: msg });
  }
};
