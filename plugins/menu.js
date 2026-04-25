'use strict'

const fs = require('fs')
const path = require('path')

module.exports = {
  commands: ['menu', 'help'],

  async execute({ sock, remoteJid, pushName, config }) {

    const pluginsDir = path.join(process.cwd(), 'plugins')
    const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js'))

    // 🎯 Categorías automáticas
    const categories = {
      economia: { name: '💰 ECONOMÍA', cmds: [] },
      diversion: { name: '😂 DIVERSIÓN', cmds: [] },
      multimedia: { name: '🎨 MULTIMEDIA', cmds: [] },
      sistema: { name: '⚙️ SISTEMA', cmds: [] },
      otros: { name: '📦 OTROS', cmds: [] }
    }

    for (const file of files) {
      try {
        const plugin = require(path.join(pluginsDir, file))
        const cmds = plugin.commands || []

        for (const cmd of cmds) {

          // 🧠 Clasificación simple por nombre
          if (cmd.includes('xp') || cmd.includes('rank') || cmd.includes('roba')) {
            categories.economia.cmds.push(cmd)
          } else if (cmd.includes('piropo') || cmd.includes('pregunta')) {
            categories.diversion.cmds.push(cmd)
          } else if (
            cmd.includes('sticker') ||
            cmd.includes('image') ||
            cmd.includes('video') ||
            cmd.includes('anime') ||
            cmd.includes('tts')
          ) {
            categories.multimedia.cmds.push(cmd)
          } else if (
            cmd.includes('premium') ||
            cmd.includes('update') ||
            cmd.includes('notify')
          ) {
            categories.sistema.cmds.push(cmd)
          } else {
            categories.otros.cmds.push(cmd)
          }
        }

      } catch {}
    }

    // 🎨 Construcción del menú
    let text = `
╔═══════════════════╗
   🌌 *SIRIUSBOT MENU*
╚═══════════════════╝

👤 Hola ${pushName} ✨
Bienvenido al menú de ${config.botName}

`

    for (const key in categories) {
      const cat = categories[key]

      if (cat.cmds.length === 0) continue

      text += `\n${cat.name}\n`
      text += '────────────────\n'

      cat.cmds.forEach(cmd => {
        text += `➤ .${cmd}\n`
      })
    }

    text += `
────────────────
🚀 Usa los comandos y sube de nivel
👑 Conviértete en leyenda del chat
`

    await sock.sendMessage(remoteJid, { text })
  }
}
