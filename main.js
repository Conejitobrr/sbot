'use strict';

require('dotenv').config();

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  jidNormalizedUser
} = require('@whiskeysockets/baileys');

const { Boom } = require('@hapi/boom');
const pino = require('pino');
const chalk = require('chalk');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

const config = require('./config');
const { messageHandler } = require('./handler');
const events = require('./lib/events');

const SESSION_DIR = path.resolve(config.sessionPath || './session');

if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

const logger = pino({ level: config.debug ? 'silent' : 'fatal' });

const store = {
  contacts: {},
  messages: {}
};

let restarting = false;

// ─────────────────────────────────────────
// LIMPIAR Y FORMATEAR NÚMERO
// ─────────────────────────────────────────
function extractNumber(jid = '') {
  if (!jid || typeof jid !== 'string') return '';

  try {
    jid = jidNormalizedUser(jid);
  } catch {}

  let number = jid.split('@')[0].split(':')[0];

  number = number.replace(/\D/g, '');

  if (!number) return '';

  if (number.length > 15) {
    number = number.slice(0, 15);
  }

  return `+${number}`;
}

// ─────────────────────────────────────────
// EXTRAER TEXTO DE MENSAJE
// ─────────────────────────────────────────
function getMessageText(msg) {
  const m = msg.message;
  if (!m) return '';

  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    m.buttonsResponseMessage?.selectedButtonId ||
    m.listResponseMessage?.singleSelectReply?.selectedRowId ||
    m.templateButtonReplyMessage?.selectedId ||
    m.interactiveResponseMessage?.body?.text ||
    ''
  );
}

// ─────────────────────────────────────────
// SABER SI ES GRUPO
// ─────────────────────────────────────────
function isGroupJid(jid = '') {
  return jid.endsWith('@g.us');
}

// ─────────────────────────────────────────
// INICIAR BOT
// ─────────────────────────────────────────
async function startBot(opts = {}) {
  const useCode = opts.method === 'code';
  const phoneNum = opts.phone || null;

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger,
    browser: useCode
      ? ['Ubuntu', 'Chrome', '20.0.04']
      : [config.botName || 'SiriusBot', 'Safari', config.botVersion || '1.0.0'],

    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },

    printQRInTerminal: false,
    emitOwnEvents: true,
    markOnlineOnConnect: false,
    syncFullHistory: false,
    generateHighQualityLinkPreview: true
  });

  // ─────────────────────────────────────────
  // PAIRING CODE
  // ─────────────────────────────────────────
  if (useCode && phoneNum && !state.creds?.registered) {
    setTimeout(async () => {
      try {
        const cleanPhone = String(phoneNum).replace(/\D/g, '');
        const rawCode = await sock.requestPairingCode(cleanPhone);

        console.log(chalk.cyan('\nCódigo de emparejamiento:\n'));
        console.log(chalk.bgCyan.black(`   ${rawCode}   \n`));
      } catch (e) {
        console.log(chalk.red('❌ Error al generar código:'), e?.message || e);
      }
    }, 3000);
  }

  // ─────────────────────────────────────────
  // CONEXIÓN
  // ─────────────────────────────────────────
  sock.ev.on('connection.update', update => {
    const { connection, qr, lastDisconnect } = update;

    if (qr && !useCode) {
      console.log(chalk.yellow('\nEscanea este QR:\n'));
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      restarting = false;

      const botNumber = extractNumber(sock.user?.id || '');

      console.log(chalk.green('\n✅ Bot conectado correctamente'));
      console.log(chalk.green('🤖 Nombre:'), config.botName);
      console.log(chalk.green('📱 Número:'), botNumber || 'No detectado');
      console.log('');

      try {
        events.init(sock);
      } catch (e) {
        console.log(chalk.red('❌ Error iniciando events:'), e?.message || e);
      }
    }

    if (connection === 'close') {
      const reason =
        lastDisconnect?.error instanceof Boom
          ? lastDisconnect.error.output?.statusCode
          : 0;

      const shouldReconnect = reason !== DisconnectReason.loggedOut;

      if (shouldReconnect && config.autoReconnect !== false) {
        if (restarting) return;

        restarting = true;

        console.log(chalk.yellow(`⚠️ Conexión cerrada. Reconectando en ${config.reconnectDelay || 3000}ms...\n`));

        setTimeout(() => {
          startBot({ method: 'saved' }).catch(e => {
            restarting = false;
            console.log(chalk.red('❌ Error al reconectar:'), e?.message || e);
          });
        }, config.reconnectDelay || 3000);
      } else {
        console.log(chalk.red('❌ Sesión cerrada.'));
        console.log(chalk.yellow('Borra la carpeta /session y vuelve a vincular el bot.\n'));
      }
    }
  });

  // ─────────────────────────────────────────
  // GUARDAR CREDENCIALES
  // ─────────────────────────────────────────
  sock.ev.on('creds.update', saveCreds);

  // ─────────────────────────────────────────
  // CONTACTOS
  // ─────────────────────────────────────────
  sock.ev.on('contacts.upsert', contacts => {
    for (const c of contacts || []) {
      if (!c.id) continue;

      const jid = jidNormalizedUser(c.id);

      store.contacts[jid] = {
        id: jid,
        name: c.name || c.notify || c.verifiedName || '',
        notify: c.notify || '',
        number: extractNumber(jid)
      };
    }
  });

  sock.ev.on('contacts.update', updates => {
    for (const u of updates || []) {
      if (!u.id) continue;

      const jid = jidNormalizedUser(u.id);

      if (!store.contacts[jid]) {
        store.contacts[jid] = {
          id: jid,
          name: '',
          notify: '',
          number: extractNumber(jid)
        };
      }

      store.contacts[jid] = {
        ...store.contacts[jid],
        name: u.notify || u.name || store.contacts[jid].name || '',
        notify: u.notify || store.contacts[jid].notify || '',
        number: extractNumber(jid)
      };
    }
  });

  // ─────────────────────────────────────────
  // MENSAJES
  // ─────────────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    if (!Array.isArray(messages)) return;

    for (const msg of messages) {
      try {
        if (!msg?.message) continue;
        if (!msg.key?.remoteJid) continue;
        if (msg.key.remoteJid === 'status@broadcast') continue;

        const remoteJid = msg.key.remoteJid;
        const fromGroup = isGroupJid(remoteJid);
        const senderJid = fromGroup
          ? msg.key.participant || remoteJid
          : remoteJid;

        const body = getMessageText(msg);
        const cleanNumber = extractNumber(senderJid);

        msg.realNumber = cleanNumber;
        msg.bodyText = body;

        try {
          await events.onMessage({
            sock,
            remoteJid,
            body,
            sender: senderJid,
            pushName: msg.pushName || 'Usuario',
            fromGroup,
            msg
          });
        } catch (e) {
          console.log(chalk.red('❌ Error en events:'), e?.message || e);
        }

        try {
          await messageHandler(sock, msg, store);
        } catch (e) {
          console.log(chalk.red('❌ Error en handler:'), e?.message || e);
        }

      } catch (e) {
        console.log(chalk.red('❌ Error procesando mensaje:'), e?.message || e);
      }
    }
  });

  return sock;
}

module.exports = {
  startBot,
  extractNumber,
  getMessageText,
  store
};
