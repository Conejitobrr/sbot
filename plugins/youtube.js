'use strict'

const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')
const yts = require('yt-search')

module.exports = {
  commands: ['yt', 'play', 'youtube'],

  async execute({ sock, remoteJid, args, msg }) {

    if (!args.length) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Envía un link o nombre de canción\nEjemplo:\n.play bad bunny'
      }, { quoted: msg })
    }

    const query = args.join(' ')
    const file = path.join(__dirname, '../tmp/audio.mp3')

    try {
      let url = query

      // 🔍 si NO es link → buscar
      if (!query.includes('youtube.com') && !query.includes('youtu.be')) {

        await sock.sendMessage(remoteJid, {
          text: '🔍 Buscando en YouTube...'
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
          text: `🎬 *${video.title}*\n⏱️ ${video.timestamp}\n\n⏳ Descargando...`
        }, { quoted: msg })

      } else {
        await sock.sendMessage(remoteJid, {
          text: '⏳ Descargando audio...'
        }, { quoted: msg })
      }

      // 🎧 descargar con yt-dlp
      exec(`yt-dlp -x --audio-format mp3 -o "${file}" "${url}"`, async (err) => {

        if (err) {
          console.log(err)
          return sock.sendMessage(remoteJid, {
            text: '❌ Error al descargar'
          }, { quoted: msg })
        }

        await sock.sendMessage(remoteJid, {
          audio: fs.readFileSync(file),
          mimetype: 'audio/mpeg'
        }, { quoted: msg }) // 🔥 AQUÍ ESTÁ LA CLAVE

        fs.unlinkSync(file)
      })

    } catch (err) {
      console.log(err)

      await sock.sendMessage(remoteJid, {
        text: '❌ Error general'
      }, { quoted: msg })
    }
  }
}
