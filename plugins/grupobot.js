'use strict'

const fs = require('fs')
const path = require('path')

const FILE = path.join(__dirname, '../database/grupooficial.json')

function loadData() {

  if (!fs.existsSync(FILE)) {
    return null
  }

  try {
    return JSON.parse(fs.readFileSync(FILE))
  } catch {
    return null
  }
}

module.exports = {
  command: [
    'grupobot',
    'grupooficial',
    'linkbot'
  ],

  async execute(ctx) {

    const {
      sock,
      remoteJid,
      msg
    } = ctx

    try {

      const data = loadData()

      if (!data?.group) {

        return sock.sendMessage(
          remoteJid,
          { text: '❌ No hay grupo oficial configurado.' },
          { quoted: msg }
        )
      }

      const metadata =
        await sock.groupMetadata(data.group)

      const code =
        await sock.groupInviteCode(data.group)

      const link =
        `https://chat.whatsapp.com/${code}`

      await sock.sendMessage(
        remoteJid,
        {
          text:
`🤖 *GRUPO OFICIAL*

📌 ${metadata.subject}

🔗 ${link}`
        },
        { quoted: msg }
      )

    } catch (e) {

      console.log(e)

      await sock.sendMessage(
        remoteJid,
        {
          text: '❌ No pude obtener el enlace del grupo.'
        },
        { quoted: msg }
      )
    }
  }
}
