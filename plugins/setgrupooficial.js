'use strict'

const fs = require('fs')
const path = require('path')
const config = require('../config')

const FILE = path.join(__dirname, '../database/grupooficial.json')

function saveData(data) {
  const dir = path.dirname(FILE)

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  fs.writeFileSync(FILE, JSON.stringify(data, null, 2))
}

module.exports = {
  command: ['setgrupooficial'],

  async execute(ctx) {

    const {
      sock,
      remoteJid,
      sender,
      msg,
      fromGroup
    } = ctx

    const isOwner = config.owner.some(owner => {
      const cleanOwner = String(owner).replace(/\D/g, '')
      const cleanSender = String(sender).replace(/\D/g, '')

      return cleanSender.includes(cleanOwner) ||
             cleanOwner.includes(cleanSender)
    })

    if (!isOwner) {
      return sock.sendMessage(
        remoteJid,
        { text: '❌ Solo los owners pueden usar este comando.' },
        { quoted: msg }
      )
    }

    if (!fromGroup) {
      return sock.sendMessage(
        remoteJid,
        { text: '❌ Usa este comando dentro de un grupo.' },
        { quoted: msg }
      )
    }

    try {

      const metadata = await sock.groupMetadata(remoteJid)

      saveData({
        group: remoteJid,
        name: metadata.subject,
        updated: Date.now()
      })

      await sock.sendMessage(
        remoteJid,
        {
          text:
`✅ Grupo oficial configurado

📌 ${metadata.subject}`
        },
        { quoted: msg }
      )

    } catch (e) {

      console.log(e)

      await sock.sendMessage(
        remoteJid,
        { text: '❌ Error configurando grupo oficial.' },
        { quoted: msg }
      )
    }
  }
}
