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

// 🔥 FUNCIÓN PARA LIMPIAR NÚMERO (FIX REAL)
function extractNumber(jid = '') {
  jid = jidNormalizedUser(jid)

  // quitar dominio
  let number = jid.split('@')[0]

  // eliminar cosas raras tipo : o ;
  number = number.split(':')[0]

  // si es muy largo y raro → cortar (fix para IDs fantasmas)
  if (number.length > 15) {
    number = number.slice(0, 12)
  }

  // formato bonito tipo +51
  if (!number.startsWith('+')) {
    number = '+' + number
  }

  return number
}

async function startBot(opts = {}) {
  const useCode = opts.method === 'code'
  const phoneNum = opts.phone || null

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,

    // 🔥 logger limpio
    logger: pino({ level: 'fatal' }),

    browser: useCode
      ? ['Ubuntu', 'Chrome', '20.0.04']
      : ['SiriusBot', 'Safari', '2.0.0'],
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(
        state.keys,
        pino({ level: 'fatal' })
      )
    },
    printQRInTerminal: false,
    emitOwnEvents: true
  })

  //═══════════════════════════════════════
  // PAIR CODE
  //═══════════════════════════════════════
  if (useCode && phoneNum && !state.creds?.registered) {
    setTimeout(async () => {
      try {
        const rawCode = await sock.requestPairingCode(phoneNum)

        console.log(chalk.cyan('\nCódigo de emparejamiento:\n'))
        console.log(chalk.bgCyan.black(`   ${rawCode}   \n`))
      } catch {
        console.log(chalk.red('Error al generar código'))
      }
    }, 3000)
  }

  //═══════════════════════════════════════
  // CONEXIÓN
  //═══════════════════════════════════════
  sock.ev.on('connection.update', update => {
    const { connection, qr, lastDisconnect } = update

    if (qr && !useCode) {
      console.log(chalk.yellow('\nEscanea este QR:\n'))
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'open') {
      const num = extractNumber(sock.user.id)

      console.log(chalk.green('\n✅ Conectado como:'), num, '\n')

      events.init(sock)
    }

    if (connection === 'close') {
      const reason =
        lastDisconnect?.error instanceof Boom
          ? lastDisconnect.error.output?.statusCode
          : 0

      if (reason !== DisconnectReason.loggedOut) {
        console.log(chalk.yellow('Reconectando...\n'))

        setTimeout(() => {
          startBot({ method: 'saved' })
        }, 3000)
      } else {
        console.log(chalk.red('Sesión cerrada. Borra /session\n'))
      }
    }
  })

  //═══════════════════════════════════════
  // CREDS
  //═══════════════════════════════════════
  sock.ev.on('creds.update', saveCreds)

  //═══════════════════════════════════════
  // CONTACTOS (FIX)
  //═══════════════════════════════════════
  sock.ev.on('contacts.upsert', contacts => {
    for (const c of contacts) {
      if (!c.id) continue

      const jid = jidNormalizedUser(c.id)

      store.contacts[jid] = {
        id: jid,
        name: c.name || c.notify || c.verifiedName || '',
        notify: c.notify || '',
        number: extractNumber(jid)
      }
    }
  })

  sock.ev.on('contacts.update', updates => {
    for (const u of updates) {
      const jid = jidNormalizedUser(u.id)

      if (!store.contacts[jid]) store.contacts[jid] = { id: jid }

      store.contacts[jid] = {
        ...store.contacts[jid],
        name:
          u.notify ||
          u.name ||
          store.contacts[jid].name ||
          '',
        notify: u.notify || store.contacts[jid].notify || '',
        number: extractNumber(jid)
      }
    }
  })

  //═══════════════════════════════════════
  // MENSAJES
  //═══════════════════════════════════════
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return

    for (const msg of messages) {
      try {
        if (!msg.message) continue
        if (!msg.key?.remoteJid) continue
        if (msg.key.remoteJid === 'status@broadcast') continue

        // 🔥 FIX: obtener número real SIEMPRE
        const senderJid = msg.key.participant || msg.key.remoteJid
        const cleanNumber = extractNumber(senderJid)

        msg.realNumber = cleanNumber // 👈 lo mandamos al handler

        // EVENTS
        try {
          await events.onMessage({
            sock,
            remoteJid: msg.key.remoteJid,
            body:
              msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text ||
              msg.message?.imageMessage?.caption ||
              msg.message?.videoMessage?.caption ||
              '',
            sender: senderJid,
            pushName: msg.pushName || 'Usuario',
            fromGroup: msg.key.remoteJid.endsWith('@g.us'),
            msg
          })
        } catch (e) {
          console.log(
            chalk.red('❌ Error en events:'),
            e?.message || e
          )
        }

        await messageHandler(sock, msg, store)

      } catch (e) {
        console.log(
          chalk.red('❌ Error en handler:'),
          e?.message || e
        )
      }
    }
  })

  return sock
}

module.exports = { startBot }
