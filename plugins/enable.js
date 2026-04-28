'use strict'

const fs = require('fs')
const path = require('path')
const db = require('../lib/database')

module.exports = {
  async onMessage(ctx) {
    const {
      sock,
      remoteJid,
      body,
      msg,
      fromGroup,
      sender
    } = ctx

    if (!body) return

    // Verificar si audios están habilitados
    const audiosEnabled = fromGroup
      ? await db.getGroupSetting(remoteJid, 'audios')
      : await db.getUserSetting(sender, 'audios')

    if (!audiosEnabled) return

    const text = body.toLowerCase()

    const audios = {
      hola: 'hola.mp3',
      autoestima: 'autoestima.mp3'
    }

    const key = Object.keys(audios).find(k => text.includes(k))
    if (!key) return

    const filePath = path.join(__dirname, '../media', audios[key])

    if (!fs.existsSync(filePath)) return

    const audio = fs.readFileSync(filePath)

    await sock.sendMessage(remoteJid, {
      audio,
      mimetype: 'audio/mpeg',
      ptt: true
    }, {
      quoted: msg
    })
  }
}
