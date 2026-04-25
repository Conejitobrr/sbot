'use strict'

const path = require('path')
const fs = require('fs')
const chalk = require('chalk')
const config = require('./config')
const db = require('./lib/database')
const trivia = require('./lib/trivia') // 👈 IMPORTANTE

const {
  getBody,
  normalizeJid,
  detectPrefix,
  getGroupAdmins
} = require('./lib/utils')

// ═══════════════════════════════════════
// PLUGINS
// ═══════════════════════════════════════

const PLUGINS_DIR = path.join(process.cwd(), 'plugins')

if (!fs.existsSync(PLUGINS_DIR)) {
  fs.mkdirSync(PLUGINS_DIR, { recursive: true })
}

const plugins = new Map()

function loadPlugins() {
  plugins.clear()

  const files = fs.readdirSync(PLUGINS_DIR)
    .filter(file => file.endsWith('.js'))

  for (const file of files) {
    try {
      const filepath = path.join(PLUGINS_DIR, file)

      delete require.cache[require.resolve(filepath)]

      const plugin = require(filepath)

      for (const cmd of (plugin.commands || [])) {
        plugins.set(cmd.toLowerCase(), plugin)
      }

    } catch (err) {
      console.log(chalk.red(`Error cargando plugin ${file}:`), err.message)
    }
  }

  console.log(chalk.green(`♻️ Plugins cargados: ${plugins.size}`))
}

global.loadPlugins = loadPlugins
loadPlugins()

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════

const normalize = txt => (txt || '').replace(/[^0-9]/g, '')

function getReadableMessage(msg) {
  const body = getBody(msg)
  if (body) return body

  const m = msg.message || {}

  if (m.imageMessage) return '[Imagen]'
  if (m.videoMessage) return '[Video]'
  if (m.stickerMessage) return '[Sticker]'
  if (m.audioMessage) return '[Audio]'
  if (m.documentMessage) return '[Documento]'
  if (m.locationMessage) return '[Ubicación]'
  if (m.contactMessage) return '[Contacto]'
  if (m.contactsArrayMessage) return '[Contactos]'
  if (m.reactionMessage) return '[Reacción]'

  return '[Sin texto]'
}

// ═══════════════════════════════════════
// HANDLER
// ═══════════════════════════════════════

async function messageHandler(sock, msg, store) {
  try {
    const { key, message } = msg
    if (!message) return

    const remoteJid = key.remoteJid
    const fromGroup = remoteJid?.endsWith('@g.us')

    let sender = fromGroup ? key.participant : remoteJid
    sender = normalizeJid(sender)

    const pushName =
      msg.pushName ||
      store.contacts?.[sender]?.name ||
      store.contacts?.[sender]?.notify ||
      'Sin nombre'

    const body = getBody(msg)
    const displayMsg = getReadableMessage(msg)
    const number = sender.replace(/@.+/, '')

    // ═══════════════════════════════════
    // 🧾 LOGGER (SIEMPRE SE EJECUTA)
    // ═══════════════════════════════════

    let chatLabel = chalk.blue('PRIVADO')
    let chatName = 'Chat Privado'

    if (fromGroup) {
      chatLabel = chalk.magenta('GRUPO')
      try {
        const metadata = await sock.groupMetadata(remoteJid)
        chatName = metadata.subject || 'Grupo'
      } catch {
        chatName = 'Grupo'
      }
    }

    console.log(chalk.gray('\n╔══════════════════════════════'))
    console.log(chalk.white('║ 📍 Tipo   :'), chatLabel)
    console.log(chalk.white('║ 🏷️ Chat   :'), chalk.cyan(chatName))
    console.log(chalk.white('║ 👤 Nombre :'), chalk.green(pushName))
    console.log(chalk.white('║ 📞 Número :'), chalk.yellow(number))
    console.log(chalk.white('║ 💬 Msg    :'), chalk.white(displayMsg))
    console.log(chalk.gray('╚══════════════════════════════\n'))

    // ═══════════════════════════════════
    // 🎯 TRIVIA (NO BLOQUEA)
    // ═══════════════════════════════════

    if (body) {
      const game = trivia.get()

      if (game && game.chat === remoteJid) {
        if (trivia.check(body)) {

          clearTimeout(game.timeout)

          await sock.sendMessage(remoteJid, {
            text: `
🎉 *RESPUESTA CORRECTA*

👤 ${pushName}
✅ Respuesta: *${game.answer}*

🔥 Nueva pregunta...
`
          })

          const next = trivia.next()

          next.timeout = setTimeout(async () => {
            const current = trivia.get()

            if (current && current.chat === remoteJid) {
              await sock.sendMessage(remoteJid, {
                text: `
⏰ *TIEMPO TERMINADO*

❓ ${current.question}
❌ Nadie respondió
✅ Respuesta: *${current.answer}*

🎮 Escribe *.trivia* para jugar de nuevo
`
              })

              trivia.stop()
            }
          }, 60000)

          await sock.sendMessage(remoteJid, {
            text: `
🎯 *TRIVIA*

❓ ${next.question}

⏱️ 60 segundos
💬 Todos pueden responder
`
          })
        }
      }
    }

    // ═══════════════════════════════════
    // ❌ SI NO ES TEXTO → NO COMANDO
    // ═══════════════════════════════════

    if (!body) return

    const parsed = detectPrefix(body)
    if (!parsed) return

    const args = parsed.body.trim().split(/\s+/)
    const command = args.shift()?.toLowerCase()
    if (!command) return

    const plugin = plugins.get(command)
    if (!plugin) return

    // ═══════════════════════════════════
    // PERMISOS
    // ═══════════════════════════════════

    const senderNum = normalize(sender)
    const botNumber = normalize(sock.user?.id?.split(':')[0])

    const ownerList = (config.owner || []).map(normalize)
    const rownerList = (config.rowner || []).map(normalize)

    const isOwner =
      senderNum === botNumber ||
      ownerList.includes(senderNum) ||
      rownerList.includes(senderNum)

    let groupAdmins = []

    if (fromGroup) {
      try {
        const metadata = await sock.groupMetadata(remoteJid)
        groupAdmins = getGroupAdmins(metadata.participants)
      } catch {}
    }

    const isAdmin = fromGroup
      ? groupAdmins.includes(sender) || isOwner
      : isOwner

    const isPremium =
      (await db.isPremium?.(sender).catch(() => false)) || isOwner

    // ═══════════════════════════════════
    // EJECUTAR PLUGIN
    // ═══════════════════════════════════

    await plugin.execute({
      sock,
      msg,
      remoteJid,
      sender,
      pushName,
      args,
      command,
      store,
      config,
      isOwner,
      isAdmin,
      isPremium,
      fromGroup
    })

    // XP
    const gainedXP = Math.floor(Math.random() * 16) + 5
    await db.addXP(sender, gainedXP)

  } catch (err) {
    console.log(chalk.red('❌ Error en handler:'), err)
  }
}

module.exports = {
  messageHandler,
  loadPlugins
}
