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
  commands: ['enable'],

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

    // ─────────────────────────────────────────
    // AYUDA
    // ─────────────────────────────────────────
    if (!feature) {
      return sock.sendMessage(remoteJid, {
        text:
`📌 Uso del comando:

.enable bot
.enable welcome
.enable audios

📋 Funciones disponibles:
${FEATURES.map(f => `➤ ${f}`).join('\n')}`
      }, { quoted: msg });
    }

    // ─────────────────────────────────────────
    // VALIDAR FEATURE
    // ─────────────────────────────────────────
    if (!FEATURES.includes(feature)) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Función no válida.\nUsa *.enable* para ver opciones.'
      }, { quoted: msg });
    }

    // ─────────────────────────────────────────
    // BOT / AUDIOS (GRUPO O PRIVADO)
    // ─────────────────────────────────────────
    if (feature === 'bot' || feature === 'audios') {
      if (fromGroup) {
        if (!isAdmin && !isOwner) {
          return sock.sendMessage(remoteJid, {
            text: '❌ Solo admins/owner pueden usar este comando.'
          }, { quoted: msg });
        }

        await db.setGroupSetting(remoteJid, feature, true);

      } else {
        await db.setUserSetting(sender, feature, true);
      }

      return sock.sendMessage(remoteJid, {
        text: `✅ *${feature}* activado correctamente.`
      }, { quoted: msg });
    }

    // ─────────────────────────────────────────
    // SOLO GRUPOS
    // ─────────────────────────────────────────
    if (!fromGroup) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Este comando solo funciona en grupos.'
      }, { quoted: msg });
    }

    // ─────────────────────────────────────────
    // SOLO ADMINS
    // ─────────────────────────────────────────
    if (!isAdmin && !isOwner) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Solo admins pueden usar este comando.'
      }, { quoted: msg });
    }

    // ─────────────────────────────────────────
    // ACTIVAR
    // ─────────────────────────────────────────
    await db.setGroupSetting(remoteJid, feature, true);

    return sock.sendMessage(remoteJid, {
      text: `✅ *${feature}* activado correctamente.`
    }, { quoted: msg });
  }
};
