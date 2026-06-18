'use strict';

module.exports = {
  // 🔥 Se cambió el nombre del comando
  commands: ['darxpbotgaaa'],

  async execute(ctx) {
    const {
      sock,
      msg,
      remoteJid,
      sender,
      args
    } = ctx;

    const db = ctx.db;

    try {
      const user = await db.getUser(sender);

      const xpActual = Number(user?.xp || 0);

      let apuesta = 500;

      if (args[0]) {
        apuesta = parseInt(args[0], 10);
      }

      if (!Number.isFinite(apuesta) || apuesta <= 0) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Debes indicar una cantidad válida.\n\nEjemplo:\n.darxpbotgaaa 50000'
        }, { quoted: msg });
      }

      if (xpActual < apuesta) {
        return sock.sendMessage(remoteJid, {
          text:
`❌ No tienes suficiente XP.

🎮 XP actual: ${xpActual}
💸 Apuesta: ${apuesta}`
        }, { quoted: msg });
      }

      // 🔥 PROBABILIDAD CAMBIADA AL 99% (0.99)
      const gano = Math.random() < 0.99;

      if (gano) {
        await db.addXP(sender, apuesta);

        const nuevoUser = await db.getUser(sender);

        return sock.sendMessage(remoteJid, {
          text:
`🎰 ¡GANASTE!

💸 Apostaste: ${apuesta} XP
🎁 Premio: ${apuesta} XP

📈 XP actual: ${nuevoUser.xp}`
        }, { quoted: msg });
      }

      // El 1% de las veces perderá
      await db.removeXP(sender, apuesta);

      const nuevoUser = await db.getUser(sender);

      return sock.sendMessage(remoteJid, {
        text:
`💀 ¡PERDISTE! (Ese 1% de mala suerte...)

💸 Apostaste: ${apuesta} XP
📉 XP perdido: ${apuesta} XP

📊 XP actual: ${nuevoUser.xp}`
      }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error en apostar:', err?.message || err);

      return sock.sendMessage(remoteJid, {
        text: '❌ Ocurrió un error realizando la apuesta.'
      }, { quoted: msg });
    }
  }
};
