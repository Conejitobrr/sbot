'use strict'

const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')
const yts = require('yt-search')
const db = require('../lib/database')

let events = null
try {
  events = require('../lib/events')
} catch {}

module.exports = {
  commands: ['ytmp4', 'video', 'ytvideo'],

  async execute({ sock, remoteJid, args, sender, msg }) {

    if (!args.length) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Envía un link o nombre del video'
      }, { quoted: msg })
    }

    let query = args.join(' ')
    let url = query

    const numero = sender.split('@')[0]

    try {
      // 🔍 BUSCAR SI NO ES LINK
      if (!query.includes('youtube.com') && !query.includes('youtu.be')) {

        await sock.sendMessage(remoteJid, {
          text: `🔍 Buscando video @${numero}...`,
          mentions: [sender]
        }, { quoted: msg })

        const res = await yts(query)
        const video = res.videos[0]

        if (!video) {
          return sock.sendMessage(remoteJid, {
            text: '❌ No se encontraron resultados'
          }, { quoted: msg })
        }

        url = video.url

        await sock.sendMessage(remoteJid, {
          text: `🎬 *${video.title}*\n⏱️ ${video.timestamp}\n\n⏳ Descargando @${numero}...`,
          mentions: [sender]
        }, { quoted: msg })

      } else {
        await sock.sendMessage(remoteJid, {
          text: `⏳ Descargando video @${numero}...`,
          mentions: [sender]
        }, { quoted: msg })
      }

      if (url.includes('list=')) {
        return sock.sendMessage(remoteJid, {
          text: '❌ No se permiten playlists'
        }, { quoted: msg })
      }

      const rawFile = path.join(__dirname, '../tmp/raw.mp4')
      const finalFile = path.join(__dirname, '../tmp/final.mp4')

      const download = `yt-dlp -f "bv*[height<=480]+ba/best[height<=480]" --merge-output-format mp4 --no-playlist -o "${rawFile}" "${url}"`

      exec(download, (err) => {

        if (err) {
          console.log(err)
          return sock.sendMessage(remoteJid, {
            text: '❌ Error al descargar'
          }, { quoted: msg })
        }

        const convert = `ffmpeg -i "${rawFile}" -c:v libx264 -c:a aac -preset veryfast -crf 28 "${finalFile}" -y`

        exec(convert, async (err2) => {

          if (err2) {
            console.log(err2)
            return sock.sendMessage(remoteJid, {
              text: '❌ Error al convertir'
            }, { quoted: msg })
          }

          const stats = fs.statSync(finalFile)
          const sizeMB = stats.size / (1024 * 1024)

          if (sizeMB > 30) {
            fs.unlinkSync(rawFile)
            fs.unlinkSync(finalFile)
            return sock.sendMessage(remoteJid, {
              text: `⚠️ Video muy pesado (${sizeMB.toFixed(1)}MB)`
            }, { quoted: msg })
          }

          // 📤 ENVIAR VIDEO (RESPONDIENDO + MENCIÓN)
          await sock.sendMessage(remoteJid, {
            video: fs.readFileSync(finalFile),
            mimetype: 'video/mp4',
            caption: `🎬 Aquí tienes tu video @${numero} ✨`,
            mentions: [sender]
          }, { quoted: msg })

          fs.unlinkSync(rawFile)
          fs.unlinkSync(finalFile)

          // ⭐ XP
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
      }, { quoted: msg })
    }
  }
}
