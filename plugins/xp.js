'use strict';

const db = require('../lib/database');

module.exports = {
  commands: ['xp', 'nivel', 'level'],
  description: 'Muestra tu experiencia y nivel',

  async execute(ctx) {
    const {
      sock,
      remoteJid,
      sender,
      msg
    } = ctx;

    const user = await db.getUser(sender);

    const xp = user.xp || 0;
    const level = user.level || 1;

    const nextLevelXP = level * 1000;
    const currentLevelBase = (level - 1) * 1000;
    const progress = xp - currentLevelBase;
    const needed = nextLevelXP - xp;

    await sock.sendMessage(remoteJid, {
      text:
`╔═══════════════╗
║   🏆 PERFIL XP
╠═══════════════╣
║ ⭐ XP Total: ${xp}
║ 📈 Nivel: ${level}
║ 🎯 Progreso: ${progress}/1000
║ ⏳ Falta: ${needed} XP
╚═══════════════╝`
    }, { quoted: msg });
  }
};
