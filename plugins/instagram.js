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
        text: '❌ Envía un link de Instagram'
      })
    }

    const url = args[0]

    if (!url.includes('instagram.com')) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Link inválido de Instagram'
      })
    }

    const tmpDir = path.join(__dirname, '../tmp')

    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true })
    }

    try {
      await sock.sendMessage(remoteJid, {
        text: '⏳ Descargando contenido...'
      })

      // 🔥 descarga TODO (videos, imágenes, carrusel)
      const cmd = `
yt-dlp \
--no-playlist \
--add-header "user-agent:Mozilla/5.0" \
-o "${tmpDir}/ig_%(id)s_%(title)s.%(ext)s" \
"${url}"
      `

      exec(cmd, async (err) => {

        if (err) {
          console.log(err)
          return sock.sendMessage(remoteJid, {
            text: '❌ No se pudo descargar (puede ser privado o inválido)'
          })
        }

        // 🔍 leer archivos descargados
        const files = fs.readdirSync(tmpDir)
          .filter(f => f.startsWith('ig_'))

        if (!files.length) {
          return sock.sendMessage(remoteJid, {
            text: '❌ No se encontró contenido'
          })
        }

        for (const file of files) {
          const filePath = path.join(tmpDir, file)
          const buffer = fs.readFileSync(filePath)

          // 🎥 VIDEO
          if (file.endsWith('.mp4') || file.endsWith('.mkv')) {

            const stats = fs.statSync(filePath)
            const sizeMB = stats.size / (1024 * 1024)

            if (sizeMB > 30) {
              await sock.sendMessage(remoteJid, {
                text: `⚠️ Video muy pesado (${sizeMB.toFixed(1)}MB)`
              })
              fs.unlinkSync(filePath)
              continue
            }

            await sock.sendMessage(remoteJid, {
              video: buffer,
              mimetype: 'video/mp4',
              caption: '📸 Instagram'
            })

          }
          // 🖼️ IMAGEN
          else if (
            file.endsWith('.jpg') ||
            file.endsWith('.jpeg') ||
            file.endsWith('.png') ||
            file.endsWith('.webp')
          ) {

            await sock.sendMessage(remoteJid, {
              image: buffer,
              caption: '📸 Instagram'
            })
          }

          // 🧹 eliminar archivo después de enviar
          fs.unlinkSync(filePath)
        }

        // ⭐ XP
        let xp = Math.floor(Math.random() * 15) + 5

        if (events?.state?.active?.type === 'double') {
          xp *= 2
        }

        await db.addXP(sender, xp)

      })

    } catch (err) {
      console.log(err)

      await sock.sendMessage(remoteJid, {
        text: '❌ Error general'
      })
    }
  }
}
