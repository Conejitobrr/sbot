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

process.on('unhandledRejection', (e) => console.log('⚠️ unhandledRejection:', e))
process.on('uncaughtException', (e) => console.log('⚠️ uncaughtException:', e))

let botInstance = null // 🔥 EVITA DOBLE BOT

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
      keys: makeCacheableSignalKeyStore(
        state.keys,
        pino({ level: 'silent' })
      )
    },
    printQRInTerminal: false,
    emitOwnEvents: true
  })

  botInstance = sock // 🔥 GUARDAR INSTANCIA

  // 🧠 WATCHDOG (detecta bot congelado)
  let lastPing = Date.now()
  setInterval(() => {
    if (Date.now() - lastPing > 120000) {
      console.log('⚠️ Bot posiblemente congelado → reiniciando...')
      try { sock.end() } catch {}
      startBot({ method: 'saved' })
    }
  }, 60000)

  sock.ev.on('connection.update', update => {
    const { connection, qr, lastDisconnect } = update

    if (qr && !useCode) {
      console.log(chalk.yellow('\nEscanea este QR:\n'))
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'open') {
      const num = jidNormalizedUser(sock.user.id).split('@')[0]
      console.log(chalk.green('\n✅ Conectado como:'), num)

      try {
        events.init(sock)
      } catch (e) {
        console.log('❌ events.init error:', e)
      }
    }

    if (connection === 'close') {
      const reason =
        lastDisconnect?.error instanceof Boom
          ? lastDisconnect.error.output?.statusCode
          : 0

      console.log(chalk.red('Conexión cerrada:'), reason)

      if (reason !== DisconnectReason.loggedOut) {
        if (botInstance) try { botInstance.end() } catch {}
        startBot({ method: 'saved' })
      }
    }
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('contacts.upsert', contacts => {
    for (const c of contacts) {
      if (c.id) store.contacts[c.id] = c
    }
  })

  // 📩 MENSAJES
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return

    for (const msg of messages) {
      try {
        lastPing = Date.now() // 🔥 ACTUALIZA VIDA DEL BOT

        if (!msg.message) continue
        if (!msg.key?.remoteJid) continue
        if (msg.key.remoteJid === 'status@broadcast') continue

        const body =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          msg.message?.videoMessage?.caption ||
          ''

        // 🔥 EVENTS PROTEGIDO + ASYNC REAL
        try {
          await events.onMessage({
            sock,
            remoteJid: msg.key.remoteJid,
            body,
            sender: msg.key.participant || msg.key.remoteJid,
            pushName: msg.pushName || 'Usuario',
            fromGroup: msg.key.remoteJid.endsWith('@g.us'),
            msg
          })
        } catch (e) {
          console.log('⚠️ events.onMessage:', e)
        }

        // 🔥 HANDLER PROTEGIDO
        try {
          await messageHandler(sock, msg, store)
        } catch (e) {
          console.log('❌ messageHandler:', e)
        }

      } catch (e) {
        console.log(chalk.red('Error general:'), e)
      }
    }
  })

  return sock
}

module.exports = { startBot }
