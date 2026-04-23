'use strict';

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');

const pino   = require('pino');
const chalk  = require('chalk');
const qrcode = require('qrcode-terminal');
const fs     = require('fs');
const path   = require('path');

// ═══════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════

const SESSION_DIR = path.resolve('./session');
if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

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

  sock.ev.on('creds.update', saveCreds);

  return sock;
}

module.exports = { startBot };
