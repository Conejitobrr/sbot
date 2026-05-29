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
        trivia: '🎯 Trivia en curso'
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
➤ *${p}tienda* → Ver tienda
➤ *${p}comprar* → Comprar objetos
➤ *${p}inventario* → Ver tus objetos
➤ *${p}usar* → Usar objetos comprados

━━━━━━━━━━━━━━━━━━━
🚔 *POLICÍA Y CÁRCEL*
━━━━━━━━━━━━━━━━━━━
➤ *${p}policia* → Atrapar ladrones recientes
➤ *${p}denunciar* → Denunciar robo reciente
➤ *${p}carcel* → Ver estado de cárcel
➤ *${p}fama* → Ver fama criminal
➤ *${p}sobornar* → Ver costo de soborno
➤ *${p}sobornar pagar* → Intentar sobornar
➤ *${p}fianza* → Ver costo de fianza
➤ *${p}fianza pagar* → Pagar fianza
➤ *${p}usar llave* → Usar llave de celda

━━━━━━━━━━━━━━━━━━━
😂 *DIVERSIÓN*
━━━━━━━━━━━━━━━━━━━
➤ *${p}piropo*
➤ *${p}pregunta*
➤ *${p}trivia*
➤ *${p}formarpareja*
➤ *${p}formarparejas*
➤ *${p}love*
➤ *${p}gay2*
➤ *${p}topgays*
➤ *${p}hornycard*
➤ *${p}tutti* añade los seg que desean
➤ *${p}consejo*
➤ *${p}frase*
➤ *${p}historiaromantica*
➤ *${p}clon*
➤ *${p}proponer*
➤ *${p}follar*

━━━━━━━━━━━━━━━━━━━
🎲 *CALCULADOR*
━━━━━━━━━━━━━━━━━━━
➤ *${p}gay* → Calculador random
➤ *${p}lesbiana* → Calculador random
➤ *${p}pajero* → Calculador random
➤ *${p}pajera* → Calculador random
➤ *${p}puto* → Calculador random
➤ *${p}puta* → Calculador random
➤ *${p}manco* → Calculador random
➤ *${p}manca* → Calculador random
➤ *${p}rata* → Calculador random
➤ *${p}prostituto* → Calculador random
➤ *${p}prostituta* → Calculador random

━━━━━━━━━━━━━━━━━━━
🎵 *DESCARGAS*
━━━━━━━━━━━━━━━━━━━
➤ *${p}play* → Audio de YouTube
➤ *${p}spotify* → Audio de Spotify (premium)
➤ *${p}song* → Audio de YouTube (premium)
➤ *${p}ytmp4* → Video de YouTube
➤ *${p}tiktok* → Video de TikTok
➤ *${p}fb* → Video de Facebook
➤ *${p}ig* → Video de Instagram

━━━━━━━━━━━━━━━━━━━
🎨 *MULTIMEDIA*
━━━━━━━━━━━━━━━━━━━
➤ *${p}letra* → letra de canciones
➤ *${p}sticker* → Crear sticker
➤ *${p}toimage* → Sticker a imagen
➤ *${p}tovideo* → Sticker a video
➤ *${p}toanime* → Estilo anime
➤ *${p}tts* → Texto a voz
➤ *${p}attp* → Texto a sticker
➤ *${p}ver* → Ver archivo de 1 sola vez(premium)
➤ *${p}fakeig* → Crear comentario fake de IG
➤ *${p}galaxia* → Crear HTML Galaxy of Love
➤ *${p}perfil* → Ver perfil de usuario

━━━━━━━━━━━━━━━━━━━
🛡️ *ADMINS*
━━━━━━━━━━━━━━━━━━━
➤ *${p}enable welcome* → Activar bienvenida
➤ *${p}disable welcome* → Desactivar bienvenida
➤ *${p}enable bot* → Activar bot
➤ *${p}disable bot* → Desactivar bot

━━━━━━━━━━━━━━━━━━━
🤖 *IA / BOT*
━━━━━━━━━━━━━━━━━━━
➤ *${p}bot* → Hablar con SiriusBot

━━━━━━━━━━━━━━━━━━━
⚙️ *PREMIUM*
━━━━━━━━━━━━━━━━━━━
➤ *${p}prem* → Estado premium
➤ *${p}notify* → Notificaciones

━━━━━━━━━━━━━━━━━━━
👑 *OWNER*
━━━━━━━━━━━━━━━━━━━
➤ *${p}addxp* → Añadir XP
➤ *${p}antidelete* → Activar/desactivar antidelete
➤ *${p}banuser* → Banear usuario del bot
➤ *${p}unbanuser* → Quitar ban del bot
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
