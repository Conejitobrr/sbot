'use strict';

const path   = require('path')
const fs     = require('fs')
const chalk  = require('chalk')
const config = require('./config')
const db     = require('./lib/database')

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

  const files = fs.readdirSync(PLUGINS_DIR).filter(f => f.endsWith('.js'))

  for (const file of files) {
    try {
      const filepath = path.join(PLUGINS_DIR, file)

      delete require.cache[require.resolve(filepath)]

      const plugin = require(filepath)
      const cmds = plugin.commands || []

      for (const cmd of cmds) {
        plugins.set(cmd.toLowerCase(), plugin)
      }

    } catch (e) {
      console.log(chalk.red(`Error plugin ${file}:`), e.message)
    }
  }

  console.log(chalk.green(`♻️ Plugins cargados: ${plugins.size}`))
}

global.loadPlugins = loadPlugins
loadPlugins()

// ═══════════════════════════════════════
// NORMALIZADOR
// ═══════════════════════════════════════

const normalize = n => (n || '').replace(/[^0-9]/g, '')

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

    const body = getBody(msg)

    // DEBUG GLOBAL
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📞 REMITENTE:', sender)
    console.log('💬 MENSAJE:', body || '[Sin texto]')
    console.log('📦 TIPO:', Object.keys(message))
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    if (!body) return

    const parsed = detectPrefix(body)
    if (!parsed) return

    const args = parsed.body.trim().split(/\s+/)
    const command = args.shift()?.toLowerCase()
    if (!command) return

    const plugin = plugins.get(command)

    if (!plugin) {
      console.log(chalk.yellow(`⚠️ Comando no encontrado: ${command}`))
      return
    }

    // ═══════════════════════════════════
    // PERMISOS
    // ═══════════════════════════════════

    const senderNum = normalize(sender)
    const botNumber = normalize(sock.user?.id?.split(':')[0])

    const ownerList  = (config.owner || []).map(normalize)
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
    // CONTEXTO
    // ═══════════════════════════════════

    const ctx = {
      sock,
      msg,
      remoteJid,
      sender,
      args,
      command,
      store,
      config,
      isOwner,
      isAdmin,
      isPremium
    }

    await plugin.execute(ctx)

  } catch (e) {
    console.log(chalk.red('❌ Error en handler:'), e)
  }
}

module.exports = {
  messageHandler,
  loadPlugins
}
