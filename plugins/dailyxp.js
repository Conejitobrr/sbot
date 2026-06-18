'use strict';

const db = require('../lib/database');

module.exports = {
  commands: ['claim', 'daily'],
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

    // 🔥 SISTEMA DE RECOMPENSAS
    let reward = 0;
    let mensajeRespuesta = '';
    
    // Genera un número aleatorio entre 0 y 1. 
    // Si es menor a 0.05 (5% de probabilidad), gana el Jackpot.
    let isLucky = Math.random() < 0.05; 

    if (isLucky) {
      reward = 10000;
      mensajeRespuesta = `🎰 *¡JACKPOT!* Hoy los dioses del bot te han sonreído.\n\n🎁 Recompensa diaria espectacular\n⭐ Ganaste: *${reward} XP*`;
    } else {
      // Recompensa normal variable: entre 1000 y 3000 XP
      reward = Math.floor(Math.random() * 2001) + 1000;
      mensajeRespuesta = `🎁 Recompensa diaria reclamada\n\n⭐ Ganaste: *${reward} XP*`;
    }

    await db.addXP(sender, reward);
    await db.setUser(sender, {
      lastDailyXp: now
    });

    await sock.sendMessage(remoteJid, {
      text: mensajeRespuesta
    }, { quoted: msg });
  }
};
