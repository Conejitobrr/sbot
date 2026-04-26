'use strict'

const fs = require('fs')
const path = require('path')

module.exports = {
  async onMessage(ctx) {
    const { sock, remoteJid, body, msg } = ctx

    if (!body) return

    const text = body.toLowerCase()

    const audios = {
      'hola': 'hola.mp3',
      'autoestima': 'autoestima.mp3'
    }

    // 🔍 buscar si contiene la palabra clave
    const key = Object.keys(audios).find(k => text.includes(k))
    if (!key) return

    const filePath = path.join(__dirname, '../media', audios[key])

    if (!fs.existsSync(filePath)) return

    const audio = fs.readFileSync(filePath)

    await sock.sendMessage(remoteJid, {
      audio,
      mimetype: 'audio/mpeg',
      ptt: true, // 🎙️ nota de voz
      quoted: msg // ✅ RESPONDE al mensaje
    })
  }
}
