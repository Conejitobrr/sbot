'use strict'

const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')

module.exports = {
  commands: ['ytmp4', 'video', 'ytvideo'],

  async execute({ sock, remoteJid, args }) {

    if (!args[0]) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Envía un link de YouTube'
      })
    }

    const url = args[0]

    if (url.includes('list=')) {
      return sock.sendMessage(remoteJid, {
        text: '❌ No se permiten playlists'
      })
    }

    const rawFile = path.join(__dirname, '../tmp/raw.mp4')
    const finalFile = path.join(__dirname, '../tmp/final.mp4')

    try {
      await sock.sendMessage(remoteJid, {
        text: '⏳ Descargando video...'
      })

      // 1️⃣ Descargar
      const download = `yt-dlp -f "bv*[height<=480]+ba/best[height<=480]" --merge-output-format mp4 --no-playlist -o "${rawFile}" "${url}"`

      exec(download, (err) => {

        if (err) {
          console.log(err)
          return sock.sendMessage(remoteJid, {
            text: '❌ Error al descargar'
          })
        }

        // 2️⃣ RE-ENCODAR (LA CLAVE 🔥)
        const convert = `ffmpeg -i "${rawFile}" -c:v libx264 -c:a aac -preset veryfast -crf 28 "${finalFile}" -y`

        exec(convert, async (err2) => {

          if (err2) {
            console.log(err2)
            return sock.sendMessage(remoteJid, {
              text: '❌ Error al convertir'
            })
          }

          const stats = fs.statSync(finalFile)
          const sizeMB = stats.size / (1024 * 1024)

          if (sizeMB > 30) {
            fs.unlinkSync(rawFile)
            fs.unlinkSync(finalFile)
            return sock.sendMessage(remoteJid, {
              text: `⚠️ Video muy pesado (${sizeMB.toFixed(1)}MB)`
            })
          }

          // 3️⃣ Enviar
          await sock.sendMessage(remoteJid, {
            video: fs.readFileSync(finalFile),
            mimetype: 'video/mp4'
          })

          // 🧹 limpiar
          fs.unlinkSync(rawFile)
          fs.unlinkSync(finalFile)

        })

      })

    } catch (err) {
      console.log(err)
      sock.sendMessage(remoteJid, {
        text: '❌ Error general'
      })
    }
  }
}
