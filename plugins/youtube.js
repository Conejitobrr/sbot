'use strict'

const ytdl = require('@distube/ytdl-core')

module.exports = {
  commands: ['yt', 'play', 'youtube'],

  async execute({ sock, remoteJid, args }) {

    if (!args[0]) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Envía un link de YouTube\nEjemplo:\n.yt https://youtube.com/...'
      })
    }

    const url = args[0]

    if (!ytdl.validateURL(url)) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Link inválido de YouTube'
      })
    }

    try {
      // 🔐 evitar bloqueos
      const agent = ytdl.createAgent()

      const info = await ytdl.getInfo(url, { agent })

      const title = info.videoDetails.title
      const length = parseInt(info.videoDetails.lengthSeconds)
      const minutes = Math.floor(length / 60)
      const views = info.videoDetails.viewCount

      await sock.sendMessage(remoteJid, {
        text: `🎬 *${title}*\n⏱️ ${minutes} min\n👀 ${views} vistas\n\n⏳ Procesando...`
      })

      // 🎧 AUDIO (estable)
      const audioStream = ytdl(url, {
        filter: 'audioonly',
        quality: 'highestaudio',
        agent
      })

      // ⚠️ límite aproximado seguro para WhatsApp (~16MB)
      if (length > 600) {
        return sock.sendMessage(remoteJid, {
          text: `⚠️ El video es muy largo.\n\n🔗 Descárgalo aquí:\n${url}`
        })
      }

      await sock.sendMessage(remoteJid, {
        audio: { stream: audioStream },
        mimetype: 'audio/mp4'
      })

    } catch (err) {
      console.log('YT ERROR:', err)

      await sock.sendMessage(remoteJid, {
        text: '❌ Error al descargar el contenido.\n🔁 Intenta con otro video o más corto.'
      })
    }
  }
}
