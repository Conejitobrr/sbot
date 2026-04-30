'use strict'

// 🚫 FILTRAR SPAM CONSOLA (MEJORADO)
const originalConsoleLog = console.log
console.log = (...args) => {
  const text = args.join(' ')

  if (
    text.includes('Closing session') ||
    text.includes('SessionEntry') ||
    text.includes('_chains') ||
    text.includes('Removing old closed session') ||
    text.includes('chainKey') ||
    text.includes('ephemeralKeyPair') ||
    text.includes('rootKey') ||
    text.includes('indexInfo')
  ) return

  originalConsoleLog(...args)
}

const path = require('path')
const fs = require('fs')
const chalk = require('chalk')
const config = require('./config')
const db = require('./lib/database')
const trivia = require('./lib/trivia')

const {
  getBody,
  normalizeJid,
  detectPrefix,
  getGroupAdmins
} = require('./lib/utils')

// 🧠 LOG DE MENSAJES DEL BOT
function attachSendLogger(sock) {
  if (sock._loggerAttached) return
  sock._loggerAttached = true

  const originalSend = sock.sendMessage

  sock.sendMessage = async (...args) => {
    try {
      const jid = args[0]
      const content = args[1] || {}

      let type = 'Desconocido'
      let preview = ''

      if (content.text) {
        type = 'Texto'
        preview = content.text
      } else if (content.image) {
        type = 'Imagen 🖼️'
        preview = content.caption || '[Imagen]'
      } else if (content.video) {
        type = 'Video 🎥'
        preview = content.caption || '[Video]'
      } else if (content.audio) {
        type = content.ptt ? 'Nota de voz 🎤' : 'Audio 🎵'
        preview = '[Audio]'
      } else if (content.sticker) {
        type = 'Sticker 🧩'
        preview = '[Sticker]'
      } else if (content.document) {
        type = 'Documento 📄'
        preview = content.fileName || '[Documento]'
      }

      console.log(chalk.green('\n╔════════ BOT ENVÍA ════════'))
      console.log(chalk.white('║ 📤 A:'), chalk.cyan(jid))
      console.log(chalk.white('║ 📦 Tipo:'), chalk.yellow(type))
      console.log(chalk.white('║ 💬 Msg:'), chalk.green(preview))
      console.log(chalk.green('╚═══════════════════════════\n'))

      return await originalSend.apply(sock, args)

    } catch (err) {
      console.log(chalk.red('❌ Error enviando mensaje:'))
      console.log(err?.stack || err)
    }
  }
}

// PLUGINS
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

// HELPERS
const normalize = txt => (txt || '').replace(/[^0-9]/g, '')

// 🔥 FIX NÚMERO REAL (ACTUALIZADO)
function getRealNumber(msg, jid) {
  // prioridad al número limpio que viene desde main.js
  if (msg?.realNumber) return msg.realNumber

  if (!jid) return 'Desconocido'

  let num = jid.split('@')[0].split(':')[0]

  // limpiar números raros largos
  if (num.length > 15) {
    num = num.slice(0, 12)
  }

  return num.startsWith('+') ? num : '+' + num
}

function getReadableMessage(msg) {
  const body = getBody(msg)
  if (body) return body

  const m = msg.message || {}

  if (m.imageMessage) return '[Imagen]'
  if (m.videoMessage) return '[Video]'
  if (m.stickerMessage) return '[Sticker]'
  if (m.audioMessage) return m.audioMessage.ptt ? '[Nota de voz]' : '[Audio]'
  if (m.documentMessage) return '[Documento]'
  if (m.locationMessage) return '[Ubicación]'
  if (m.contactMessage) return '[Contacto]'
  if (m.contactsArrayMessage) return '[Contactos]'
  if (m.reactionMessage) return '[Reacción]'

  return '[Sin texto]'
}

// HANDLER
async function messageHandler(sock, msg, store) {
  try {
    attachSendLogger(sock)

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

    // 🔥 USAR FIX NUEVO
    const number = getRealNumber(msg, sender)

    // LOGGER
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

    if (!body) return

    const parsed = detectPrefix(body)
    if (!parsed) return

    const args = parsed.body.trim().split(/\s+/)
    const command = args.shift()?.toLowerCase()
    if (!command) return

    const plugin = plugins.get(command)
    if (!plugin) return

    console.log(chalk.yellow(`⚡ Ejecutando comando: ${command}`))

    try {
      await plugin.execute({
        sock,
        msg,
        remoteJid,
        sender,
        pushName,
        args,
        command,
        store,
        config
      })

      console.log(chalk.green(`✅ Comando ejecutado correctamente: ${command}`))

    } catch (e) {
      console.log(chalk.red(`❌ Error en comando ${command}:`))
      console.log(e?.stack || e)
    }

    await db.addXP(sender, Math.floor(Math.random() * 16) + 5)

  } catch (err) {
    console.log(chalk.red('❌ Error en handler:'))
    console.log(err?.stack || err)
  }
}

module.exports = {
  messageHandler,
  loadPlugins
}
