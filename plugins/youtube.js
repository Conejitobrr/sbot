'use strict'

const ytdl = require('@distube/ytdl-core')

module.exports = {
  commands: ['yt', 'play', 'youtube'],

  async execute({ sock, remoteJid, args }) {

    if (!args[0]) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Envía un link de YouTube'
      })
    }

    const url = args[0]

    if (!ytdl.validateURL(url)) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Link inválido'
      })
    }

    try {
      const agent = ytdl.createAgent()

      const info = await ytdl.getInfo(url, { agent })

      const title = info.videoDetails.title
      const length = parseInt(info.videoDetails.lengthSeconds)
      const minutes = Math.floor(length / 60)

      await sock.sendMessage(remoteJid, {
        text: `🎬 *${title}*\n⏱️ ${minutes} min\n\n🎧 Enviando audio...`
      })

      const stream = ytdl(url, {
        filter: 'audioonly',
        quality: 'highestaudio',
        agent
      })

      return await sock.sendMessage(remoteJid, {
        audio: { stream },
        mimetype: 'audio/mp4'
      })

    } catch (err) {
      console.log('YT FALLÓ, USANDO API...', err.message)

      // 🔥 FALLBACK API (rápido y funciona mejor)
      try {
        const api = `https://api.vevioz.com/api/button/mp3/${url}`

        await sock.sendMessage(remoteJid, {
          text: `⚠️ No pude procesar directo\n\n🔗 Descárgalo aquí:\n${api}`
        })

      } catch (e) {
        await sock.sendMessage(remoteJid, {
          text: `❌ Error total\n\n🔗 Usa este link:\n${url}`
        })
      }
    }
  }
}
