'use strict'

const fs = require('fs')
const path = require('path')

const FILE = path.join(__dirname, '../database/grupooficial.json')

// ⚠️ CAMBIA POR TU NÚMERO
const OWNERS = [
  '51999999999@s.whatsapp.net'
]

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

    // 🔒 Solo Owner
    if (!OWNERS.includes(sender)) {
      return sock.sendMessage(
        remoteJid,
        {
          text: '❌ Solo el Owner del bot puede usar este comando.'
        },
        { quoted: msg }
      )
    }

    if (!fromGroup) {
      return sock.sendMessage(
        remoteJid,
        {
          text: '❌ Debes usar este comando dentro del grupo que deseas marcar como oficial.'
        },
        { quoted: msg }
      )
    }

    try {

      const metadata = await sock.groupMetadata(remoteJid)

      const data = loadData()

      data.group = remoteJid

      saveData(data)

      await sock.sendMessage(
        remoteJid,
        {
          text:
`✅ Grupo oficial configurado correctamente.

📌 Grupo:
${metadata.subject}

🆔
${remoteJid}`
        },
        { quoted: msg }
      )

    } catch (e) {

      console.log(e)

      await sock.sendMessage(
        remoteJid,
        {
          text: '❌ Error configurando grupo oficial.'
        },
        { quoted: msg }
      )
    }
  }
}
