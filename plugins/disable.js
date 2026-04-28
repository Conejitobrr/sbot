'use strict'

const db = require('../lib/database')

module.exports = {
  commands: ['disable'],

  async execute(ctx) {
    const {
      sock,
      msg,
      remoteJid,
      args,
      fromGroup,
      isAdmin,
      isOwner
    } = ctx

    const feature = (args[0] || '').toLowerCase()

    if (!feature) {
      return sock.sendMessage(remoteJid, {
        text: 'Uso:\n.disable bot\n.disable welcome'
      }, { quoted: msg })
    }

    // BOT puede desactivarse en grupos o privado
    if (feature === 'bot') {
      if (!isAdmin && !isOwner) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Solo admins/owner pueden usar este comando.'
        }, { quoted: msg })
      }

      await db.setChat(remoteJid, {
        botEnabled: false
      })

      return sock.sendMessage(remoteJid, {
        text: '✅ *bot* desactivado.'
      }, { quoted: msg })
    }

    // Resto solo grupos
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

    await db.setGroup(remoteJid, {
      [feature]: false
    })

    await sock.sendMessage(remoteJid, {
      text: `✅ *${feature}* desactivado.`
    }, { quoted: msg })
  }
}
