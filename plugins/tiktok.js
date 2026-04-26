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
  commands: ['tiktok', 'tt', 'tiktokdl'],

  async execute({ sock, remoteJid, args, sender }) {

    if (!args.length) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Envía un link de TikTok'
      })
    }

    const url = args[0]

    if (!url.includes('tiktok.com')) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Link inválido de TikTok'
      })
    }

    try {
      await sock.sendMessage(remoteJid, {
        text: '⏳ Descargando video sin marca de agua...'
      })

      const rawFile = path.join(__dirname, '../tmp/tiktok.mp4')
      const finalFile = path.join(__dirname, '../tmp/tiktok_final.mp4')

      // 🔥 DESCARGA SIN WATERMARK
      const cmd = `
yt-dlp -f "mp4" \
--no-playlist \
--add-header "user-agent:Mozilla/5.0" \
-o "${rawFile}" "${url}"
      `

      exec(cmd, (err) => {

        if (err) {
          console.log(err)
          return sock.sendMessage(remoteJid, {
            text: '❌ Error al descargar TikTok'
          })
        }

        // 🔥 convertir limpio
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
            caption: '🎬 TikTok sin marca de agua'
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
