'use strict';

const db = require('../lib/database');

module.exports = {
  commands: ['addxp'],
  description: 'Añadir XP a un usuario (Owner)',

  async execute(ctx) {
    const {
      sock,
      remoteJid,
      sender,
      msg,
      args,
      isOwner
    } = ctx;

    if (!isOwner) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Solo el owner puede usar este comando.'
      }, { quoted: msg });
    }

    let target;

    // Responder mensaje
    if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
      target =
        msg.message.extendedTextMessage.contextInfo.participant;
    }

    // Mención
    else if (
      msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length
    ) {
      target =
        msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
    }

    if (!target) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Debes mencionar o responder a alguien.'
      }, { quoted: msg });
    }

    const amount = parseInt(
      args.find(a => /^\d+$/.test(a))
    );

    if (!amount || amount <= 0) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Debes indicar una cantidad válida.\n\nEjemplo:\n.addxp @usuario 1000'
      }, { quoted: msg });
    }

    await db.addXP(target, amount);

    const number = target.split('@')[0];

    await sock.sendMessage(remoteJid, {
      text:
`✅ XP añadida correctamente

Se añadieron ${amount} XP a @${number}`,
      mentions: [target]
    }, { quoted: msg });
  }
};
