'use strict';

const db = require('../lib/database');

module.exports = {
  commands: ['robarxp'],
  description: 'Roba experiencia a otro usuario',

  async execute(ctx) {
    const {
      sock,
      remoteJid,
      sender,
      msg,
      fromGroup
    } = ctx;

    if (!fromGroup) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Este comando solo funciona en grupos.'
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

    if (target === sender) {
      return sock.sendMessage(remoteJid, {
        text: '❌ No puedes robarte a ti mismo.'
      }, { quoted: msg });
    }

    const robber = await db.getUser(sender);
    const victim = await db.getUser(target);

    const now = Date.now();
    const cooldown = 60 * 60 * 1000;

    const remaining = cooldown - (now - (robber.lastRobXp || 0));

    if (remaining > 0) {
      const m = Math.floor(remaining / 60000);

      return sock.sendMessage(remoteJid, {
        text:
`⏳ Debes esperar ${m} minuto(s)
antes de volver a robar XP.`
      }, { quoted: msg });
    }

    if ((victim.xp || 0) < 200) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Esa persona no tiene suficiente XP para robar.'
      }, { quoted: msg });
    }

    let amount = Math.floor(Math.random() * 151) + 50;

    let jackpot = false;

    if (Math.random() < 0.05) {
      amount = 1000;
      jackpot = true;
    }

    amount = Math.min(amount, victim.xp);

    await db.removeXP(target, amount);
    await db.addXP(sender, amount);

    await db.setUser(sender, {
      lastRobXp: now
    });

    const number = target.split('@')[0];

    await sock.sendMessage(remoteJid, {
      text:
jackpot
? `💎 JACKPOT!\n\nRobaste ${amount} XP a @${number}`
: `🦹 Robaste ${amount} XP a @${number}`,
      mentions: [target]
    }, { quoted: msg });
  }
};
