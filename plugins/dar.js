'use strict';

const db = require('../lib/database');

module.exports = {
  commands: ['dar', 'darxp'],
  description: 'Dar XP a otro usuario',

  async execute(ctx) {
    const {
      sock,
      remoteJid,
      sender,
      msg,
      args
    } = ctx;

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

    if (target === sender) {
      return sock.sendMessage(remoteJid, {
        text: '❌ No puedes darte XP a ti mismo.'
      }, { quoted: msg });
    }

    const amount = parseInt(
      args.find(a => /^\d+$/.test(a))
    );

    if (!amount || amount <= 0) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Debes indicar una cantidad válida.\n\nEjemplo:\n.dar @usuario 500'
      }, { quoted: msg });
    }

    const user = await db.getUser(sender);

    if ((user.xp || 0) < amount) {
      return sock.sendMessage(remoteJid, {
        text: '❌ No tienes suficiente XP.'
      }, { quoted: msg });
    }

    await db.transferXP(sender, target, amount);

    const number = target.split('@')[0];

    await sock.sendMessage(remoteJid, {
      text:
`🎁 Transferencia realizada

Has dado ${amount} XP a @${number}`,
      mentions: [target]
    }, { quoted: msg });
  }
};
