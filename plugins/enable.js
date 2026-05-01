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

    if (!feature) {
      return sock.sendMessage(remoteJid, {
        text:
`📌 Uso del comando:

.enable bot
.enable welcome
.enable audios

📋 Funciones disponibles:
${FEATURES.map(f => `➤ ${f}`).join('\n')}

🔐 Solo owner puede usar enable/disable.
👥 En grupos, admins también pueden usar: .enable welcome`
      }, { quoted: msg });
    }

    if (!FEATURES.includes(feature)) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Función no válida.\nUsa *.enable* para ver opciones.'
      }, { quoted: msg });
    }

    // ✅ REGLA ESPECIAL:
    // En grupos, admins pueden activar SOLO welcome.
    const adminCanUseWelcome = fromGroup && feature === 'welcome' && isAdmin;

    // 🔥 Todo lo demás SOLO OWNER
    if (!isOwner && !adminCanUseWelcome) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Solo el owner puede usar este comando.\n\n👥 Los admins solo pueden usar *.enable welcome* en grupos.'
      }, { quoted: msg });
    }

    // PRIVADO: solo bot/audios tienen sentido
    if (!fromGroup) {
      if (!['bot', 'audios'].includes(feature)) {
        return sock.sendMessage(remoteJid, {
          text: '❌ En privado solo puedes usar:\n.enable bot\n.enable audios'
        }, { quoted: msg });
      }

      await db.setUserSetting(sender, feature, true);

      return sock.sendMessage(remoteJid, {
        text: `✅ *${feature}* activado correctamente en privado.`
      }, { quoted: msg });
    }

    // GRUPO
    await db.setGroupSetting(remoteJid, feature, true);

    return sock.sendMessage(remoteJid, {
      text: `✅ *${feature}* activado correctamente en este grupo.`
    }, { quoted: msg });
  }
};
