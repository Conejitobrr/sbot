'use strict'

const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')
const db = require('../lib/database')

let events = null
try {
  events = require('../lib/events')
} catch {}

module.exports = {
  commands: ['instagram', 'ig', 'igdl'],

  async execute({ sock, remoteJid, args, sender }) {

    if (!args.length) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Envía un link de Instagram (reel, post o video)'
      })
    }

    const url = args[0]

    if (!url.includes('instagram.com')) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Link inválido de Instagram'
      })
    }

    try {
      await sock.sendMessage(remoteJid, {
        text: '⏳ Descargando contenido de Instagram...'
      })

      const rawFile = path.join(__dirname, '../tmp/ig.mp4')
      const finalFile = path.join(__dirname, '../tmp/ig_final.mp4')

      // 🔥 DESCARGA IG (reels, videos, posts)
      const cmd = `
yt-dlp -f "mp4/best" \
--no-playlist \
--add-header "user-agent:Mozilla/5.0" \
-o "${rawFile}" "${url}"
      `

      exec(cmd, (err) => {

        if (err) {
          console.log(err)
          return sock.sendMessage(remoteJid, {
            text: '❌ Error al descargar Instagram'
          })
        }

        // 🔥 convertir (optimizado para WhatsApp)
        const convert = `
ffmpeg -i "${rawFile}" \
-c:v libx264 -c:a aac -preset veryfast -crf 28 \
"${finalFile}" -y
        `

        exec(convert, async (err2) => {

          if (err2) {
            console.log(err2)
            return sock.sendMessage(remoteJid, {
              text: '❌ Error al procesar video'
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

          await sock.sendMessage(remoteJid, {
            video: fs.readFileSync(finalFile),
            mimetype: 'video/mp4',
            caption: '📸 Descargado desde Instagram'
          })

          fs.unlinkSync(rawFile)
          fs.unlinkSync(finalFile)

          // ⭐ XP opcional
          let xp = Math.floor(Math.random() * 15) + 5

          if (events?.state?.active?.type === 'double') {
            xp *= 2
          }

          await db.addXP(sender, xp)

        })

      })

    } catch (err) {
      console.log(err)

      await sock.sendMessage(remoteJid, {
        text: '❌ Error general'
      })
    }
  }
}
