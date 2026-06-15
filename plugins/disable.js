'use strict';

const db = require('../lib/database');

const FEATURES = [
  'bot',
  'audios',
  'welcome',
  'antilink',
  'antispam',
  'chatbot'
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
      isOwner,
      isAdmin
    } = ctx;

    const feature = (args[0] || '').toLowerCase();

    if (!feature) {
      return sock.sendMessage(remoteJid, {
        text:
`📌 Uso del comando:

.disable bot
.disable welcome
.disable audios
.disable chatbot

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

    // 🔥 OWNER O ADMIN (solo para welcome y audios)
    if (!isOwner) {

      const adminAllowed =
        fromGroup &&
        isAdmin &&
        ['welcome', 'audios'].includes(feature);

      if (!adminAllowed) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Solo el owner puede usar este comando.'
        }, { quoted: msg });
      }
    }

    // 🌐 CHATBOT GLOBAL
    if (feature === 'chatbot') {

      if (typeof db.setGlobalSetting === 'function') {
        await db.setGlobalSetting('chatbot', false);
      } else if (typeof db.setSetting === 'function') {
        await db.setSetting('chatbot', false);
      }

      return sock.sendMessage(remoteJid, {
        text: '✅ *chatbot* desactivado globalmente.\n\n🤖 Ahora dejará de responder en todos los chats.'
      }, { quoted: msg });
    }

    // 🔥 PRIVADO
    if (!fromGroup) {

      if (!['bot', 'audios', 'chatbot'].includes(feature)) {
        return sock.sendMessage(remoteJid, {
          text: '❌ En privado solo puedes usar:\n.disable bot\n.disable audios\n.disable chatbot'
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
