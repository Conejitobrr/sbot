'use strict'

const events = require('../lib/events')

module.exports = {
  commands: ['menu', 'help'],

  async execute({ sock, remoteJid, pushName, config }) {

    const active = events.getState?.()

    let eventText = '🔕 Sin eventos activos'

    if (active) {
      const map = {
        bonus: '💰 Bonus XP activo',
        rob: '😈 Robo activo',
        double: '⚡ Doble XP activo',
        trivia: '🎯 Trivia en curso'
      }

      eventText = map[active.type] || '🎮 Evento activo'
    }

    const text = `
╔═══════════════════╗
   🌌 *SIRIUSBOT MENU*
╚═══════════════════╝

👤 Hola ${pushName} ✨
Bienvenido a ${config.botName}

━━━━━━━━━━━━━━━━━━━
🎮 *EVENTOS EN VIVO*
━━━━━━━━━━━━━━━━━━━
➤ ${eventText}

━━━━━━━━━━━━━━━━━━━
💰 *ECONOMÍA*
━━━━━━━━━━━━━━━━━━━
➤ .xp
➤ .rank
➤ .claim
➤ .robar
➤ .addxp
➤ .dar

━━━━━━━━━━━━━━━━━━━
😂 *DIVERSIÓN*
━━━━━━━━━━━━━━━━━━━
➤ .piropo
➤ .pregunta

━━━━━━━━━━━━━━━━━━━
🎨 *MULTIMEDIA*
━━━━━━━━━━━━━━━━━━━
➤ .sticker
➤ .play nombre de la canción/enlace
➤ .ytmp4 nombre del video/enlace
➤ .toimage
➤ .tovideo
➤ .toanime
➤ .tts

━━━━━━━━━━━━━━━━━━━
⚙️ *SISTEMA*
━━━━━━━━━━━━━━━━━━━
➤ .premium
➤ .notify
➤ .update

━━━━━━━━━━━━━━━━━━━
🚀 Usa los comandos y sube de nivel
👑 Conviértete en leyenda del chat
`

    await sock.sendMessage(remoteJid, { text })
  }
}
