'use strict'

module.exports = {
  commands: ['yt', 'play', 'youtube'],

  async execute({ sock, remoteJid, args }) {

    if (!args[0]) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Envía un link de YouTube'
      })
    }

    const url = args[0]

    try {
      await sock.sendMessage(remoteJid, {
        text: '⏳ Descargando...'
      })

      // 🔥 API directa (mp3 real)
      const api = `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(url)}`

      await sock.sendMessage(remoteJid, {
        audio: { url: api },
        mimetype: 'audio/mpeg'
      })

    } catch (err) {
      console.log('YT ERROR:', err)

      await sock.sendMessage(remoteJid, {
        text: `❌ No se pudo enviar audio\n🔗 ${url}`
      })
    }
  }
}
