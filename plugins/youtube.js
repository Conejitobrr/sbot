'use strict'

const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')

module.exports = {
  commands: ['yt', 'play', 'youtube'],

  async execute({ sock, remoteJid, args }) {

    if (!args[0]) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Envía un link de YouTube'
      })
    }

    const url = args[0]

    const file = path.join(__dirname, '../tmp/audio.mp3')

    try {
      await sock.sendMessage(remoteJid, {
        text: '⏳ Descargando audio...'
      })

      // 🔥 descargar con yt-dlp
      exec(`yt-dlp -x --audio-format mp3 -o "${file}" "${url}"`, async (err) => {

        if (err) {
          console.log(err)
          return sock.sendMessage(remoteJid, {
            text: '❌ Error al descargar'
          })
        }

        // 📤 enviar audio
        await sock.sendMessage(remoteJid, {
          audio: fs.readFileSync(file),
          mimetype: 'audio/mpeg'
        })

        // 🧹 borrar archivo
        fs.unlinkSync(file)
      })

    } catch (err) {
      console.log(err)

      await sock.sendMessage(remoteJid, {
        text: '❌ Error general'
      })
    }
  }
}
