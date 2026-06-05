'use strict'

const fs = require('fs')
const path = require('path')
const config = require('../config')

const FILE = path.join(__dirname, '../database/grupooficial.json')

function loadData() {
  if (!fs.existsSync(FILE)) return {}

  try {
    return JSON.parse(fs.readFileSync(FILE))
  } catch {
    return {}
  }
}

function saveData(data) {
  const dir = path.dirname(FILE)

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  fs.writeFileSync(FILE, JSON.stringify(data, null, 2))
}

module.exports = {
  command: ['setgrupooficial'],

  async run(ctx) {

    const {
      sock,
      remoteJid,
      sender,
      msg,
      fromGroup
    } = ctx

    // 🔒 Verificar Owner
    const isOwner = config.owner.some(owner => {
      const cleanOwner = String(owner).replace(/\D/g, '')
      const cleanSender = String(sender).replace(/\D/g, '')

      return (
        cleanSender === cleanOwner ||
        cleanSender.includes(cleanOwner) ||
        cleanOwner.includes(cleanSender)
      )
    })

    if (!isOwner) {
      return sock.sendMessage(
        remoteJid,
        {
          text: '❌ Solo los Owners del bot pueden usar este comando.'
        },
        { quoted: msg }
      )
    }

    if (!fromGroup) {
      return sock.sendMessage(
        remoteJid,
        {
          text: '❌ Usa este comando dentro del grupo que deseas marcar como oficial.'
        },
        { quoted: msg }
      )
    }

    try {

      const metadata = await sock.groupMetadata(remoteJid)

      const data = loadData()

      data.group = remoteJid
      data.name = metadata.subject
      data.updated = Date.now()

      saveData(data)

      await sock.sendMessage(
        remoteJid,
        {
          text:
`✅ *Grupo oficial configurado correctamente*

📌 Nombre:
${metadata.subject}

🆔 ID:
${remoteJid}`
        },
        { quoted: msg }
      )

    } catch (e) {

      console.log('❌ Error setgrupooficial:', e)

      await sock.sendMessage(
        remoteJid,
        {
          text: '❌ Error configurando el grupo oficial.'
        },
        { quoted: msg }
      )
    }
  }
}
