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

    const p = Array.isArray(config.prefix) ? config.prefix[0] : config.prefix;

    const text = `
╭━━━〔 🌌 *SiriusBot* 〕━━━⬣

👋 Hola *${pushName}*
✨ Bienvenido al sistema

╰━━━━━━━━━━━━━━━━━━━━⬣

🎮 *EVENTOS*
┈┈┈┈┈┈┈┈┈┈
➤ ${eventText}

💰 *ECONOMÍA*
┈┈┈┈┈┈┈┈┈┈
➤ *${p}xp*
➤ *${p}rank*
➤ *${p}claim*
➤ *${p}robar*
➤ *${p}addxp*
➤ *${p}dar*

😂 *DIVERSIÓN*
┈┈┈┈┈┈┈┈┈┈
➤ *${p}piropo*
➤ *${p}pregunta*

🎧 *DESCARGAS AUDIO*
┈┈┈┈┈┈┈┈┈┈
➤ *${p}play* nombre/enlace

🎬 *DESCARGAS VIDEO*
┈┈┈┈┈┈┈┈┈┈
➤ *${p}ytmp4* nombre/enlace

🎨 *MULTIMEDIA*
┈┈┈┈┈┈┈┈┈┈
➤ *${p}sticker*
➤ *${p}toimage*
➤ *${p}tovideo*
➤ *${p}toanime*
➤ *${p}tts*

⚙️ *SISTEMA*
┈┈┈┈┈┈┈┈┈┈
➤ *${p}premium*
➤ *${p}notify*
➤ *${p}update*

╭━━━━━━━━━━━━━━━━━━⬣
🚀 Usa comandos y sube de nivel  
👑 Conviértete en leyenda
╰━━━━━━━━━━━━━━━━━━⬣
`

    await sock.sendMessage(remoteJid, { text })
  }
}
