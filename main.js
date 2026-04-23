'use strict';

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  jidNormalizedUser
} = require('@whiskeysockets/baileys');

const { Boom } = require('@hapi/boom');
const pino   = require('pino');
const chalk  = require('chalk');
const qrcode = require('qrcode-terminal');
const fs     = require('fs');
const path   = require('path');

// 👇 handler
const { messageHandler } = require('./handler');

// ═══════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════

const SESSION_DIR = path.resolve('./session');

if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

// 🧠 STORE SIMPLE (nuevo reemplazo)
const store = { contacts: {}, messages: {} };

// ═══════════════════════════════════════
// START BOT
// ═══════════════════════════════════════

async function startBot(opts = {}) {

  const useCode  = opts.method === 'code';
  const phoneNum = opts.phone || null;

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    browser: useCode
      ? ['Ubuntu', 'Chrome', '20.0.04']
      : ['SiriusBot', 'Safari', '2.0.0'],
    auth: {
      creds: state.creds,
      keys : makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
    },
    printQRInTerminal: false
  });

  // ═══════════════════════════════════
  // CÓDIGO DE EMPAREJAMIENTO
  // ═══════════════════════════════════

  if (useCode && phoneNum && !state.creds?.registered) {
    setTimeout(async () => {
      try {
        const rawCode = await sock.requestPairingCode(phoneNum);
        console.log(chalk.cyan('\nCódigo de emparejamiento:\n'));
        console.log(chalk.bgCyan.black(`   ${rawCode}   \n`));
      } catch (e) {
        console.log(chalk.red('Error al generar código'));
      }
    }, 3000);
  }

  // ═══════════════════════════════════
  // EVENTOS DE CONEXIÓN
  // ═══════════════════════════════════

  sock.ev.on('connection.update', (update) => {
    const { connection, qr, lastDisconnect } = update;

    // 🔥 QR
    if (qr && !useCode) {
      console.log(chalk.yellow('\nEscanea este QR:\n'));
      qrcode.generate(qr, { small: true });
    }

    // ✅ CONECTADO
    if (connection === 'open') {
      const num = jidNormalizedUser(sock.user.id).split('@')[0];
      console.log(chalk.green('\n✅ Conectado como:'), num, '\n');
    }

    // 🔁 RECONEXIÓN
    if (connection === 'close') {
      const reason = lastDisconnect?.error instanceof Boom
        ? lastDisconnect.error.output?.statusCode
        : 0;

      if (reason !== DisconnectReason.loggedOut) {
        console.log(chalk.yellow('Reconectando...\n'));
        startBot({ method: 'saved' });
      } else {
        console.log(chalk.red('Sesión cerrada. Borra /session\n'));
      }
    }
  });

  // 💾 GUARDAR SESIÓN
  sock.ev.on('creds.update', saveCreds);

  // ═══════════════════════════════════
  // CONTACTOS (reemplazo de store.bind)
  // ═══════════════════════════════════

  sock.ev.on('contacts.upsert', contacts => {
    for (const c of contacts) {
      if (c.id) store.contacts[c.id] = c;
    }
  });

  // ═══════════════════════════════════
  // MENSAJES
  // ═══════════════════════════════════

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message) continue;

      try {
        await messageHandler(sock, msg, store);
      } catch (e) {
        console.log(chalk.red('Error en handler:'), e.message);
      }
    }
  });

  return sock;
}

module.exports = { startBot };
