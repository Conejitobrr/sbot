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

sock.ev.on('connection.update', update => {
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

if (reason !== DisconnectReason.loggedOut) {  
console.log(chalk.yellow('Reconectando...\n'))  

// 🔥 FIX reconexión segura
setTimeout(() => {
startBot({ method: 'saved' })
}, 3000)

} else {  
console.log(chalk.red('Sesión cerrada. Borra /session\n'))  
}  
}
})

sock.ev.on('creds.update', saveCreds)

sock.ev.on('contacts.upsert', contacts => {
for (const c of contacts) {
if (c.id) {
store.contacts[c.id] = c
}
}
})

// MENSAJES
sock.ev.on('messages.upsert', async ({ messages, type }) => {
console.log(chalk.blue('📨 messages.upsert type:'), type)

if (type !== 'notify') return  

for (const msg of messages) {  
try {  
console.log(  
chalk.magenta('➡️ Mensaje recibido en main:'),  
JSON.stringify(msg.message, null, 2)  
)  

if (!msg.message) continue  
if (!msg.key?.remoteJid) continue  
if (msg.key.remoteJid === 'status@broadcast') continue  

// 🔥 FIX: proteger events
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
sender: msg.key.participant || msg.key.remoteJid,
pushName: msg.pushName || 'Usuario',
fromGroup: msg.key.remoteJid.endsWith('@g.us'),
msg
})
} catch (e) {
console.log(chalk.red('❌ Error en events:'), e?.message || e)
}

// HANDLER  
await messageHandler(sock, msg, store)  

} catch (e) {  
console.log(chalk.red('Error en handler:'), e)  
}  
}
})

return sock
}

module.exports = { startBot }
