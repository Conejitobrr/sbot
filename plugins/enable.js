'use strict'

const db = require('../lib/database')

module.exports = {
  commands: ['enable'],

  async execute(ctx) {
    const {
      sock,
      msg,
      remoteJid,
      sender,
      args,
      fromGroup,
      isAdmin,
      isOwner
    } = ctx

    const feature = (args[0] || '').toLowerCase()

    if (!feature) {
      return sock.sendMessage(remoteJid, {
        text: 'Uso:\n.enable bot\n.enable welcome'
      }, { quoted: msg })
    }

    // BOT (grupo o privado)
    if (feature === 'bot') {
      if (fromGroup) {
        if (!isAdmin && !isOwner) {
          return sock.sendMessage(remoteJid, {
            text: '❌ Solo admins/owner pueden usar este comando.'
          }, { quoted: msg })
        }

        await db.setGroupSetting(remoteJid, 'bot', true)

      } else {
        await db.setUserSetting(sender, 'bot', true)
      }

      return sock.sendMessage(remoteJid, {
        text: '✅ *bot* activado.'
      }, { quoted: msg })
    }

    // Otras funciones solo en grupos
    if (!fromGroup) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Este comando solo funciona en grupos.'
      }, { quoted: msg })
    }

    if (!isAdmin) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Solo admins pueden usar este comando.'
      }, { quoted: msg })
    }

    const group = await db.getGroup(remoteJid)

    if (!(feature in group)) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Función no válida.'
      }, { quoted: msg })
    }

    await db.setGroupSetting(remoteJid, feature, true)

    await sock.sendMessage(remoteJid, {
      text: `✅ *${feature}* activado.`
    }, { quoted: msg })
  }
}
