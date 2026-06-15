'use strict';

const fs = require('fs');
const path = require('path');
const db = require('../lib/database');

const DB_PATH = path.join(process.cwd(), 'lib', 'database.json');

const FEATURES = [
  'bot',
  'audios',
  'welcome',
  'antilink',
  'antispam',
  'chatbot'
];

function setGlobalSetting(feature, value) {
  let data = {};

  try {
    if (fs.existsSync(DB_PATH)) {
      data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8') || '{}');
    }
  } catch {
    data = {};
  }

  if (!data.global) {
    data.global = {};
  }

  data.global[feature] = value;

  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
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
      isOwner,
      isAdmin
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
      setGlobalSetting('chatbot', true);

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
