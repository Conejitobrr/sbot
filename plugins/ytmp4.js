'use strict'

const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')

module.exports = {
  commands: ['ytmp4', 'video', 'ytvideo'],

  async execute({ sock, remoteJid, args }) {

    if (!args[0]) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Envía un link de YouTube\nEjemplo:\n.ytmp4 https://youtube.com/...'
      })
    }

    const url = args[0]

    // 🚫 evitar playlists
    if (url.includes('list=')) {
      return sock.sendMessage(remoteJid, {
        text: '❌ No se permiten playlists'
      })
    }

    const file = path.join(__dirname, '../tmp/video.mp4')

    try {
      await sock.sendMessage(remoteJid, {
        text: '⏳ Descargando video en 480p...'
      })

      // 🎥 480p con audio fusionado
      const cmd = `yt-dlp -f "bv*[height<=480]+ba/best[height<=480]" --merge-output-format mp4 --no-playlist -o "${file}" "${url}"`

      exec(cmd, async (err) => {

        if (err) {
          console.log('YT VIDEO ERROR:', err)
          return sock.sendMessage(remoteJid, {
            text: '❌ Error al descargar el video'
          })
        }

        // 📦 verificar tamaño
        const stats = fs.statSync(file)
        const sizeMB = stats.size / (1024 * 1024)

        if (sizeMB > 30) {
          fs.unlinkSync(file)
          return sock.sendMessage(remoteJid, {
            text: `⚠️ El video pesa ${sizeMB.toFixed(1)}MB\nNo se puede enviar por WhatsApp`
          })
        }

        // 📤 enviar video
        await sock.sendMessage(remoteJid, {
          video: fs.readFileSync(file),
          mimetype: 'video/mp4'
        })

        // 🧹 limpiar archivo
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
