'use strict';

const db = require('../lib/database');

module.exports = {
  commands: ['addxp', 'quitarxp', 'delxp', 'removexp'],
  description: 'Añadir o quitar XP a un usuario o al bot (Owner)',

  async execute(ctx) {
    const {
      sock,
      remoteJid,
      sender,
      msg,
      args,
      isOwner,
      botJid
    } = ctx;

    if (!isOwner) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Solo el owner puede usar este comando.'
      }, { quoted: msg });
    }

    let target;

    // 1. Responder mensaje
    if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
      target = msg.message.extendedTextMessage.contextInfo.participant;
    }
    // 2. Mención
    else if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
      target = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
    }
    // 3. Atajo para el bot
    else if (args.includes('bot') || args.includes('Bot')) {
      let botId = botJid || sock.user?.id || '';
      target = botId.includes(':') ? botId.split(':')[0] + '@s.whatsapp.net' : botId;
    }

    if (!target) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Debes mencionar, responder a alguien o poner "bot".\n\nEjemplos:\n.addxp @usuario 1000\n.quitarxp bot 500'
      }, { quoted: msg });
    }

    // Buscamos solo números positivos normales
    const amountStr = args.find(a => /^\d+$/.test(a));
    const amount = parseInt(amountStr);

    if (isNaN(amount) || amount <= 0) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Debes indicar una cantidad válida mayor a 0.\n\nEjemplos:\n.addxp @usuario 1000\n.quitarxp @usuario 500'
      }, { quoted: msg });
    }

    // Detectamos si el owner usó un comando para quitar
    const textMessage = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const isRemovingCommand = /^[.!/#](quitarxp|delxp|removexp)\b/i.test(textMessage);

    // 🔥 LA MAGIA: Usamos las funciones nativas de tu database.js
    if (isRemovingCommand) {
      await db.removeXP(target, amount);
    } else {
      await db.addXP(target, amount);
    }

    // Extraemos solo el número limpio
    const number = target.split('@')[0].split(':')[0]; 
    const isBot = args.includes('bot') || args.includes('Bot');

    const accionTexto = isRemovingCommand ? 'quitaron' : 'añadieron';
    const icono = isRemovingCommand ? '➖' : '✅';

    await sock.sendMessage(remoteJid, {
      text: `${icono} XP actualizada correctamente\n\nSe ${accionTexto} ${amount} XP a ${isBot ? 'SiriusBot 🤖' : `@${number}`}`,
      mentions: [target]
    }, { quoted: msg });
  }
};
