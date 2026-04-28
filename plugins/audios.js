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

    const key = Object.keys(audios).find(k => text.includes(k))
    if (!key) return

    const filePath = path.resolve(__dirname, '../media', audios[key])

    // 🔥 DEBUG SILENCIOSO (quita después si quieres)
    console.log('🎧 AUDIO CHECK:', key, filePath)

    if (!fs.existsSync(filePath)) {
      console.log('❌ Audio no encontrado:', filePath)
      return
    }

    try {
      await sock.sendMessage(remoteJid, {
        audio: { url: filePath },
        mimetype: 'audio/mpeg',
        ptt: true,
        quoted: msg
      })
    } catch (err) {
      console.log('❌ Error enviando audio:', err?.message || err)
    }
  }
}
