'use strict'

const fs = require('fs')
const path = require('path')

const FILE = path.join(__dirname, '../database/grupooficial.json')

function loadData() {
  if (!fs.existsSync(FILE)) return {}

  try {
    return JSON.parse(fs.readFileSync(FILE))
  } catch {
    return {}
  }
}

module.exports = {
  command: [
    'grupobot',
    'grupooficial',
    'botgrupo',
    'linkbot'
  ],

  async run(ctx) {

    const {
      sock,
      remoteJid,
      msg
    } = ctx

    try {

      const data = loadData()

      if (!data.group) {
        return sock.sendMessage(
          remoteJid,
          {
            text: '❌ No hay un grupo oficial configurado.'
          },
          { quoted: msg }
        )
      }

      const metadata = await sock.groupMetadata(data.group)

      const code = await sock.groupInviteCode(data.group)

      const link = `https://chat.whatsapp.com/${code}`

      await sock.sendMessage(
        remoteJid,
        {
          text:
`🤖 *GRUPO OFICIAL DEL BOT*

📌 Nombre:
${metadata.subject}

🔗 Enlace:
${link}`
        },
        { quoted: msg }
      )

    } catch (e) {

      console.log('❌ Error grupobot:', e)

      await sock.sendMessage(
        remoteJid,
        {
          text: '❌ No pude obtener el enlace del grupo oficial.'
        },
        { quoted: msg }
      )
    }
  }
}
