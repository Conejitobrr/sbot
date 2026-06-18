'use strict';

const db = require('../lib/database');

module.exports = {
  commands: ['addxp'],
  description: 'Añadir XP a un usuario o al bot (Owner)',

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
      // Extraemos el ID del bot y nos aseguramos de limpiarlo de códigos de dispositivo
      let botId = botJid || sock.user?.id || '';
      target = botId.includes(':') ? botId.split(':')[0] + '@s.whatsapp.net' : botId;
    }

    if (!target) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Debes mencionar, responder a alguien o poner "bot".\n\nEjemplos:\n.addxp @usuario 1000\n.addxp bot 1000'
      }, { quoted: msg });
    }

    const amount = parseInt(
      args.find(a => /^\d+$/.test(a))
    );

    if (!amount || amount <= 0) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Debes indicar una cantidad válida.\n\nEjemplos:\n.addxp @usuario 1000\n.addxp bot 1000'
      }, { quoted: msg });
    }

    // Tu lógica original que guardaba correctamente la XP
    await db.addXP(target, amount);

    // Extraemos solo el número limpio para mostrarlo en el texto
    const number = target.split('@')[0].split(':')[0]; 
    const isBot = args.includes('bot') || args.includes('Bot');

    await sock.sendMessage(remoteJid, {
      text:
`✅ XP añadida correctamente

Se añadieron ${amount} XP a ${isBot ? 'SiriusBot 🤖' : `@${number}`}`,
      mentions: [target] // Tu mención original que funcionaba perfecto
    }, { quoted: msg });
  }
};
