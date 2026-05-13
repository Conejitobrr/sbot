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
${FEATURES.map(f => `➤ ${f}`).join('\n')}

🔐 Solo el owner puede usar este comando.`
      }, { quoted: msg });
    }

    if (!FEATURES.includes(feature)) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Función no válida.\nUsa *.disable* para ver opciones.'
      }, { quoted: msg });
    }

    // 🔥 SOLO OWNER
    if (!isOwner) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Solo el owner puede usar este comando.'
      }, { quoted: msg });
    }

    // 🔥 PRIVADO
    if (!fromGroup) {

      if (!['bot', 'audios'].includes(feature)) {
        return sock.sendMessage(remoteJid, {
          text: '❌ En privado solo puedes usar:\n.disable bot\n.disable audios'
        }, { quoted: msg });
      }

      await db.setUserSetting(
        sender.split('@')[0],
        feature,
        false
      );

      return sock.sendMessage(remoteJid, {
        text: `✅ *${feature}* desactivado correctamente en privado.`
      }, { quoted: msg });
    }

    // 🔥 GRUPO
    await db.setGroupSetting(remoteJid, feature, false);

    return sock.sendMessage(remoteJid, {
      text: `✅ *${feature}* desactivado correctamente en este grupo.`
    }, { quoted: msg });
  }
};
