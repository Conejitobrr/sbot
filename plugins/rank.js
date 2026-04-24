'use strict';

const db = require('../lib/database');

function getRole(level) {
  if (level >= 100) return '👑 Inmortal';
  if (level >= 50) return '🌟 Leyenda';
  if (level >= 30) return '🧙 Maestro';
  if (level >= 20) return '⚔️ Elite';
  if (level >= 10) return '🛡️ Guerrero';
  if (level >= 5) return '📚 Aprendiz';
  return '🐣 Novato';
}

function makeBar(progress, total, size = 10) {
  const filled = Math.round((progress / total) * size);
  const empty = size - filled;

  return '█'.repeat(filled) + '░'.repeat(empty);
}

module.exports = {
  commands: ['rank'],
  description: 'Muestra tu rango y progreso',

  async execute(ctx) {
    const {
      sock,
      remoteJid,
      sender,
      pushName,
      msg
    } = ctx;

    const user = await db.getUser(sender);

    const xp = user.xp || 0;
    const level = user.level || 1;

    const currentBase = (level - 1) * 1000;
    const nextBase = level * 1000;

    const progress = xp - currentBase;
    const needed = nextBase - xp;

    const role = getRole(level);
    const bar = makeBar(progress, 1000);

    await sock.sendMessage(remoteJid, {
      text:
`╔════════════════════╗
║      🎖️ TU RANGO
╠════════════════════╣
║ 👤 ${pushName}
║
║ ⭐ XP: ${xp}
║ 📈 Nivel: ${level}
║ 🎭 Rol: ${role}
║
║ ${bar}
║ ${progress}/1000 XP
║
║ ⏳ Faltan: ${needed} XP
╚════════════════════╝`
    }, { quoted: msg });
  }
};
