'use strict'

const fetch = require('node-fetch')

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
        text: '⏳ Procesando video...'
      })

      // 🔥 API estable
      const api = `https://api.vevioz.com/api/button/mp3/${url}`

      // 👉 solo mandamos link directo limpio
      await sock.sendMessage(remoteJid, {
        text: `🎧 Descarga tu audio aquí:\n${api}`
      })

    } catch (err) {
      console.log('YT ERROR:', err)

      await sock.sendMessage(remoteJid, {
        text: `❌ Error\n\n🔗 Usa este link:\n${url}`
      })
    }
  }
}
