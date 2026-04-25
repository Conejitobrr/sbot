'use strict'

const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')
const yts = require('yt-search')
const db = require('../lib/database')

// 👉 intenta cargar eventos (opcional)
let events = null
try {
  events = require('../lib/events')
} catch {}

module.exports = {
  commands: ['ytmp4', 'video', 'ytvideo'],

  async execute({ sock, remoteJid, args, sender }) {

    if (!args.length) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Envía un link o nombre del video'
      })
    }

    let query = args.join(' ')
    let url = query

    try {
      // 🔍 SI NO ES LINK → BUSCAR
      if (!query.includes('youtube.com') && !query.includes('youtu.be')) {

        await sock.sendMessage(remoteJid, {
          text: '🔍 Buscando video...'
        })

        const res = await yts(query)
        const video = res.videos[0]

        if (!video) {
          return sock.sendMessage(remoteJid, {
            text: '❌ No se encontraron resultados'
          })
        }

        url = video.url

        await sock.sendMessage(remoteJid, {
          text: `🎬 *${video.title}*\n⏱️ ${video.timestamp}\n\n⏳ Descargando...`
        })

      } else {
        await sock.sendMessage(remoteJid, {
          text: '⏳ Descargando video...'
        })
      }

      if (url.includes('list=')) {
        return sock.sendMessage(remoteJid, {
          text: '❌ No se permiten playlists'
        })
      }

      const rawFile = path.join(__dirname, '../tmp/raw.mp4')
      const finalFile = path.join(__dirname, '../tmp/final.mp4')

      // 1️⃣ DESCARGAR
      const download = `yt-dlp -f "bv*[height<=480]+ba/best[height<=480]" --merge-output-format mp4 --no-playlist -o "${rawFile}" "${url}"`

      exec(download, (err) => {

        if (err) {
          console.log(err)
          return sock.sendMessage(remoteJid, {
            text: '❌ Error al descargar'
          })
        }

        // 2️⃣ CONVERTIR
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

          // 📤 ENVIAR
          await sock.sendMessage(remoteJid, {
            video: fs.readFileSync(finalFile),
            mimetype: 'video/mp4'
          })

          // 🧹 limpiar
          fs.unlinkSync(rawFile)
          fs.unlinkSync(finalFile)

          // ⭐ XP SILENCIOSO
          let xp = Math.floor(Math.random() * 20) + 10

          if (events?.state?.active?.type === 'double') {
            xp *= 2
          }

          await db.addXP(sender, xp)

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
