'use strict';

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore
} = require('@whiskeysockets/baileys');

const pino   = require('pino');
const chalk  = require('chalk');
const qrcode = require('qrcode-terminal');
const fs     = require('fs');
const path   = require('path');

// 👇 IMPORTANTE: handler
const { messageHandler } = require('./handler');

// ═══════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════

const SESSION_DIR = path.resolve('./session');

if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

// 🧠 STORE (para contactos, nombres, etc)
const store = makeInMemoryStore({
  logger: pino({ level: 'silent' })
});

// ═══════════════════════════════════════
// START BOT
// ═══════════════════════════════════════

async function startBot(opts = {}) {

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: state,
    printQRInTerminal: false
  });

  // 🔥 VINCULAR STORE
  store.bind(sock.ev);

  // ═══════════════════════════════════
  // CÓDIGO DE EMPAREJAMIENTO
  // ═══════════════════════════════════

  if (opts.method === 'code' && opts.phone && !state.creds?.registered) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(opts.phone);

        console.log(chalk.cyan('\n  Código de emparejamiento:\n'));
        console.log(chalk.bgCyan.black(`   ${code}   \n`));
      } catch (e) {
        console.log(chalk.red('Error al generar código'));
      }
    }, 3000);
  }

  // ═══════════════════════════════════
  // EVENTOS
  // ═══════════════════════════════════

  sock.ev.on('connection.update', ({ connection, qr, lastDisconnect }) => {

    if (qr && opts.method === 'qr') {
      console.log(chalk.yellow('\nEscanea este QR:\n'));
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      console.log(chalk.green('\n✅ Conectado como SiriusBot\n'));
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;

      if (reason !== DisconnectReason.loggedOut) {
        console.log(chalk.yellow('Reconectando...\n'));
        startBot({ method: 'saved' });
      } else {
        console.log(chalk.red('Sesión cerrada. Borra /session\n'));
      }
    }
  });

  // 🔥 GUARDAR SESIÓN
  sock.ev.on('creds.update', saveCreds);

  // 🔥 AQUÍ ESTABA EL ERROR
  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
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
