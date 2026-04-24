'use strict';

const db = require('../lib/database');

module.exports = {
  commands: ['dailyxp', 'daily'],
  description: 'Reclama tu recompensa diaria de XP',

  async execute(ctx) {
    const {
      sock,
      remoteJid,
      sender,
      msg
    } = ctx;

    const user = await db.getUser(sender);

    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000;

    const remaining = cooldown - (now - (user.lastDailyXp || 0));

    if (remaining > 0) {
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);

      return sock.sendMessage(remoteJid, {
        text:
`⏳ Ya reclamaste tu recompensa diaria.

🕒 Vuelve en: ${h}h ${m}m`
      }, { quoted: msg });
    }

    const reward = Math.floor(Math.random() * 1501) + 500;

    await db.addXP(sender, reward);
    await db.setUser(sender, {
      lastDailyXp: now
    });

    await sock.sendMessage(remoteJid, {
      text:
`🎁 Recompensa diaria reclamada

⭐ Ganaste: ${reward} XP`
    }, { quoted: msg });
  }
};
