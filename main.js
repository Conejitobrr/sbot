'use strict'

require('dotenv').config()

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  jidNormalizedUser
} = require('@whiskeysockets/baileys')

const { Boom } = require('@hapi/boom')
const pino = require('pino')
const chalk = require('chalk')
const qrcode = require('qrcode-terminal')
const fs = require('fs')
const path = require('path')

const { messageHandler } = require('./handler')
const events = require('./lib/events')

const SESSION_DIR = path.resolve('./session')

if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true })
}

const store = {
  contacts: {},
  messages: {}
}

// 🧠 Anti-crash global
process.on('unhandledRejection', (e) => console.log('⚠️ unhandledRejection:', e))
process.on('uncaughtException', (e) => console.log('⚠️ uncaughtException:', e))

async function startBot(opts = {}) {
  const useCode = opts.method === 'code'
  const phoneNum = opts.phone || null

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    browser: useCode
      ? ['Ubuntu', 'Chrome', '20.0.04']
      : ['SiriusBot', 'Safari', '2.0.0'],

    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
    },

    printQRInTerminal: false,
    emitOwnEvents: true,

    // 🔥 CAMBIO IMPORTANTE 1
    markOnlineOnConnect: true,
    keepAliveIntervalMs: 30_000
  })

  // 🔥 CAMBIO IMPORTANTE 2 (mejor reconexión)
  sock.ev.on('connection.update', (update) => {
    const { connection, qr, lastDisconnect } = update

    if (qr && !useCode) {
      console.log(chalk.yellow('\nEscanea este QR:\n'))
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'open') {
      const num = jidNormalizedUser(sock.user.id).split('@')[0]
      console.log(chalk.green('\n✅ Conectado como:'), num, '\n')

      events.init(sock)
    }

    if (connection === 'close') {
      const reason =
        lastDisconnect?.error instanceof Boom
          ? lastDisconnect.error.output?.statusCode
          : 0

      console.log('⚠️ conexión cerrada:', reason)

      if (reason !== DisconnectReason.loggedOut) {
        setTimeout(() => startBot({ method: 'saved' }), 3000)
      } else {
        console.log(chalk.red('Sesión cerrada. Borra /session'))
      }
    }

    if (connection === 'connecting') {
      console.log('🔄 reconectando...')
    }
  })

  sock.ev.on('creds.update', saveCreds)

  // 📩 MENSAJES (🔥 CAMBIO CLAVE)
  sock.ev.on('messages.upsert', async ({ messages, type }) => {

    // ❌ QUITADO ESTE FILTRO (ERA EL PROBLEMA)
    // if (type !== 'notify') return

    console.log('📨 messages.upsert type:', type)

    for (const msg of messages) {
      try {
        if (!msg.message) continue
        if (!msg.key?.remoteJid) continue
        if (msg.key.remoteJid === 'status@broadcast') continue

        await events.onMessage({
          sock,
          remoteJid: msg.key.remoteJid,
          body:
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            msg.message?.imageMessage?.caption ||
            msg.message?.videoMessage?.caption ||
            '',
          sender: msg.key.participant || msg.key.remoteJid,
          pushName: msg.pushName || 'Usuario',
          fromGroup: msg.key.remoteJid.endsWith('@g.us'),
          msg
        })

        await messageHandler(sock, msg, store)

      } catch (e) {
        console.log('❌ error mensaje:', e)
      }
    }
  })

  return sock
}

module.exports = { startBot }
