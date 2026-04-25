'use strict'

module.exports = {
  commands: ['menu', 'help'],

  async execute({ sock, remoteJid, pushName, config }) {

    const text = `
╔═══════════════════╗
   🌌 *SIRIUSBOT MENU*
╚═══════════════════╝

👤 Hola ${pushName} ✨
Bienvenido a ${config.botName}

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
