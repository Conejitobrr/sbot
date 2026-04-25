'use strict'

const ytdl = require('ytdl-core')

module.exports = {
  commands: ['yt', 'youtube', 'play'],

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
      const info = await ytdl.getInfo(url)
      const title = info.videoDetails.title
      const length = info.videoDetails.lengthSeconds

      // 🎧 opción ligera: audio
      const audio = ytdl(url, {
        filter: 'audioonly',
        quality: 'highestaudio'
      })

      await sock.sendMessage(remoteJid, {
        text: `🎬 *${title}*\n⏱️ ${Math.floor(length / 60)} min\n\n📥 Enviando audio...`
      })

      await sock.sendMessage(remoteJid, {
        audio: { stream: audio },
        mimetype: 'audio/mp4',
        ptt: false
      })

    } catch (err) {
      console.log(err)

      await sock.sendMessage(remoteJid, {
        text: '❌ Error al procesar el video'
      })
    }
  }
}
