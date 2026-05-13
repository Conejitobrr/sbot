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

async function setGlobalSetting(feature, value) {
  if (typeof db.setGlobalSetting === 'function') {
    return db.setGlobalSetting(feature, value);
  }

  if (typeof db.setSetting === 'function') {
    return db.setSetting(feature, value);
  }

  throw new Error('Falta agregar setGlobalSetting en lib/database.js');
}

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
.enable chatbot

📋 Funciones disponibles:
${FEATURES.map(f => `➤ ${f}`).join('\n')}

🔐 Solo el owner puede usar este comando.`
      }, { quoted: msg });
    }

    if (!FEATURES.includes(feature)) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Función no válida.\nUsa *.enable* para ver opciones.'
      }, { quoted: msg });
    }

    if (!isOwner) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Solo el owner puede usar este comando.'
      }, { quoted: msg });
    }

    // 🌐 CHATBOT GLOBAL
    if (feature === 'chatbot') {
      await setGlobalSetting('chatbot', true);

      return sock.sendMessage(remoteJid, {
        text: '✅ *chatbot* activado globalmente.\n\n🤖 Ahora funcionará en todos los chats.'
      }, { quoted: msg });
    }

    // 🔥 PRIVADO
    if (!fromGroup) {
      if (!['bot', 'audios'].includes(feature)) {
        return sock.sendMessage(remoteJid, {
          text: '❌ En privado solo puedes usar:\n.enable bot\n.enable audios\n.enable chatbot'
        }, { quoted: msg });
      }

      await db.setUserSetting(
        sender.split('@')[0],
        feature,
        true
      );

      return sock.sendMessage(remoteJid, {
        text: `✅ *${feature}* activado correctamente en privado.`
      }, { quoted: msg });
    }

    // 🔥 GRUPO
    await db.setGroupSetting(remoteJid, feature, true);

    return sock.sendMessage(remoteJid, {
      text: `✅ *${feature}* activado correctamente en este grupo.`
    }, { quoted: msg });
  }
};
