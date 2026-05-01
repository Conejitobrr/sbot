'use strict';

const events = require('../lib/events');

module.exports = {
  commands: ['menu', 'help', 'menú'],

  async execute({ sock, msg, remoteJid, pushName, config }) {
    const p = config.prefix || '.';

    const active = events.getState?.();
    let eventText = '🔕 Sin eventos activos';

    if (active) {
      const map = {
        bonus: '💰 Bonus XP activo',
        rob: '😈 Robo XP activo',
        trivia: '🎯 Trivia en curso',
        double: '⚡ Doble XP activo'
      };

      eventText = map[active.type] || '🎮 Evento activo';
    }

    const text =
`╔══════════════════════╗
        🌌 *${config.botName || 'SiriusBot'}*
╚══════════════════════╝

👤 Hola *${pushName || 'Usuario'}* ✨
⚙️ Prefijo: *${p}*

━━━━━━━━━━━━━━━━━━━
🎮 *EVENTOS*
━━━━━━━━━━━━━━━━━━━
➤ ${eventText}

━━━━━━━━━━━━━━━━━━━
💰 *ECONOMÍA*
━━━━━━━━━━━━━━━━━━━
➤ *${p}xp* → Ver tu experiencia
➤ *${p}rank* → Ranking del chat
➤ *${p}claim* → Recompensa diaria
➤ *${p}robar* → Robar XP
➤ *${p}dar* → Transferir XP

━━━━━━━━━━━━━━━━━━━
😂 *DIVERSIÓN*
━━━━━━━━━━━━━━━━━━━
➤ *${p}piropo*
➤ *${p}pregunta*
➤ *${p}trivia*
➤ *${p}formarpareja*
➤ *${p}formarparejas*
➤ *${p}love*
➤ *${p}gay*
➤ *${p}topgays*
➤ *${p}hornycard*

━━━━━━━━━━━━━━━━━━━
🎵 *DESCARGAS*
━━━━━━━━━━━━━━━━━━━
➤ *${p}play* → Audio de YouTube
➤ *${p}ytmp4* → Video de YouTube
➤ *${p}tiktok* → Video de TikTok
➤ *${p}fb* → Video de Facebook
➤ *${p}ig* → Video de Instagram

━━━━━━━━━━━━━━━━━━━
🎨 *MULTIMEDIA*
━━━━━━━━━━━━━━━━━━━
➤ *${p}sticker* → Crear sticker
➤ *${p}s* → Crear sticker
➤ *${p}toimage* → Sticker a imagen
➤ *${p}tovideo* → Sticker a video
➤ *${p}tts* → Texto a voz
➤ *${p}attp* → Texto a sticker

━━━━━━━━━━━━━━━━━━━
⚙️ *SISTEMA*
━━━━━━━━━━━━━━━━━━━
➤ *${p}prem* → Estado premium
➤ *${p}notify* → Notificaciones
➤ *${p}enable* → Activar función
➤ *${p}disable* → Desactivar función

━━━━━━━━━━━━━━━━━━━
👑 *OWNER*
━━━━━━━━━━━━━━━━━━━
➤ *${p}addxp* → Añadir XP
➤ *${p}update* → Actualizar bot

━━━━━━━━━━━━━━━━━━━
🚀 Usa los comandos y sube de nivel`;

    await sock.sendMessage(
      remoteJid,
      { text },
      { quoted: msg }
    );
  }
};
