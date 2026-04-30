
'use strict';

const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

const config = require('./config');
const db = require('./lib/database');

const {
  getBody,
  normalizeJid,
  detectPrefix,
  getGroupAdmins
} = require('./lib/utils');

// ─────────────────────────────────────────
// FILTRAR SPAM DE CONSOLA
// ─────────────────────────────────────────
const originalConsoleLog = console.log;

console.log = (...args) => {
  const text = args.map(v => String(v)).join(' ');

  const blocked = [
    'Closing session',
    'SessionEntry',
    '_chains',
    'Removing old closed session',
    'chainKey',
    'ephemeralKeyPair',
    'rootKey',
    'indexInfo'
  ];

  if (blocked.some(word => text.includes(word))) return;

  originalConsoleLog(...args);
};

// ─────────────────────────────────────────
// LOGGER DE ENVÍOS
// ─────────────────────────────────────────
function attachSendLogger(sock) {
  if (sock._loggerAttached) return;
  sock._loggerAttached = true;

  const originalSend = sock.sendMessage.bind(sock);

  sock.sendMessage = async (jid, content = {}, options = {}) => {
    try {
      let type = 'Desconocido';
      let preview = '';

      if (content.text) {
        type = 'Texto';
        preview = content.text;
      } else if (content.image) {
        type = 'Imagen 🖼️';
        preview = content.caption || '[Imagen]';
      } else if (content.video) {
        type = 'Video 🎥';
        preview = content.caption || '[Video]';
      } else if (content.audio) {
        type = content.ptt ? 'Nota de voz 🎤' : 'Audio 🎵';
        preview = '[Audio]';
      } else if (content.sticker) {
        type = 'Sticker 🧩';
        preview = '[Sticker]';
      } else if (content.document) {
        type = 'Documento 📄';
        preview = content.fileName || '[Documento]';
      }

      if (config.debug) {
        console.log(chalk.green('\n╔════════ BOT ENVÍA ════════'));
        console.log(chalk.white('║ 📤 A    :'), chalk.cyan(jid));
        console.log(chalk.white('║ 📦 Tipo :'), chalk.yellow(type));
        console.log(chalk.white('║ 💬 Msg  :'), chalk.green(String(preview).slice(0, 300)));
        console.log(chalk.green('╚═══════════════════════════\n'));
      }

      return await originalSend(jid, content, options);
    } catch (err) {
      console.log(chalk.red('❌ Error enviando mensaje:'), err?.message || err);
    }
  };
}

// ─────────────────────────────────────────
// CARPETA DE PLUGINS
// Soporta /plugin y /plugins
// ─────────────────────────────────────────
function getPluginsDir() {
  const singular = path.join(process.cwd(), 'plugin');
  const plural = path.join(process.cwd(), 'plugins');

  if (fs.existsSync(singular)) return singular;
  if (fs.existsSync(plural)) return plural;

  fs.mkdirSync(singular, { recursive: true });
  return singular;
}

const PLUGINS_DIR = getPluginsDir();
const plugins = new Map();

// ─────────────────────────────────────────
// CARGAR PLUGINS
// ─────────────────────────────────────────
function loadPlugins() {
  plugins.clear();

  const files = fs
    .readdirSync(PLUGINS_DIR)
    .filter(file => file.endsWith('.js'));

  let loadedFiles = 0;

  for (const file of files) {
    try {
      const filepath = path.join(PLUGINS_DIR, file);

      delete require.cache[require.resolve(filepath)];

      const plugin = require(filepath);

      if (!plugin || typeof plugin.execute !== 'function') {
        console.log(chalk.yellow(`⚠️ Plugin ignorado ${file}: falta execute()`));
        continue;
      }

      const commands = Array.isArray(plugin.commands) ? plugin.commands : [];

      if (!commands.length) {
        console.log(chalk.yellow(`⚠️ Plugin ignorado ${file}: no tiene commands`));
        continue;
      }

      for (const cmd of commands) {
        plugins.set(String(cmd).toLowerCase(), {
          ...plugin,
          file
        });
      }

      loadedFiles++;
    } catch (err) {
      console.log(chalk.red(`❌ Error cargando plugin ${file}:`), err?.message || err);
    }
  }

  console.log(chalk.green(`♻️ Plugins cargados: ${plugins.size} comandos en ${loadedFiles} archivos`));
}

global.loadPlugins = loadPlugins;
loadPlugins();

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
function cleanNumber(jid = '') {
  return String(jid)
    .split('@')[0]
    .split(':')[0]
    .replace(/\D/g, '');
}

function getReadableMessage(msg) {
  const body = getBody(msg);
  if (body) return body;

  const m = msg.message || {};

  if (m.imageMessage) return '[Imagen]';
  if (m.videoMessage) return '[Video]';
  if (m.stickerMessage) return '[Sticker]';
  if (m.audioMessage) return m.audioMessage.ptt ? '[Nota de voz]' : '[Audio]';
  if (m.documentMessage) return '[Documento]';
  if (m.locationMessage) return '[Ubicación]';
  if (m.contactMessage) return '[Contacto]';
  if (m.contactsArrayMessage) return '[Contactos]';
  if (m.reactionMessage) return '[Reacción]';

  return '[Sin texto]';
}

async function safeGroupMetadata(sock, jid) {
  try {
    return await sock.groupMetadata(jid);
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────
// HANDLER PRINCIPAL
// ─────────────────────────────────────────
async function messageHandler(sock, msg, store = {}) {
  try {
    attachSendLogger(sock);

    if (!msg?.message) return;

    const key = msg.key || {};
    const remoteJid = key.remoteJid;

    if (!remoteJid) return;
    if (remoteJid === 'status@broadcast') return;

    const fromMe = !!key.fromMe;
    const fromGroup = remoteJid.endsWith('@g.us');

    let sender = fromGroup ? key.participant : remoteJid;
    sender = normalizeJid(sender || remoteJid);

    const botJid = normalizeJid(sock.user?.id || '');
    const body = getBody(msg);
    const displayMsg = getReadableMessage(msg);

    const pushName =
      msg.pushName ||
      store.contacts?.[sender]?.name ||
      store.contacts?.[sender]?.notify ||
      'Sin nombre';

    const number = cleanNumber(sender);

    let groupMetadata = null;
    let groupAdmins = [];
    let isAdmin = false;
    let isBotAdmin = false;

    let chatName = 'Chat Privado';
    let chatLabel = chalk.blue('PRIVADO');

    if (fromGroup) {
      chatLabel = chalk.magenta('GRUPO');
      groupMetadata = await safeGroupMetadata(sock, remoteJid);
      chatName = groupMetadata?.subject || 'Grupo';

      try {
        groupAdmins = await getGroupAdmins(sock, remoteJid);
        isAdmin = groupAdmins.includes(sender);
        isBotAdmin = groupAdmins.includes(botJid);
      } catch {}
    }

    if (config.debug) {
      console.log(chalk.gray('\n╔══════════════════════════════'));
      console.log(chalk.white('║ 📍 Tipo   :'), chatLabel);
      console.log(chalk.white('║ 🏷️ Chat   :'), chalk.cyan(chatName));
      console.log(chalk.white('║ 👤 Nombre :'), chalk.green(pushName));
      console.log(chalk.white('║ 📞 Número :'), chalk.yellow(number ? `+${number}` : 'Desconocido'));
      console.log(chalk.white('║ 💬 Msg    :'), chalk.white(String(displayMsg).slice(0, 300)));
      console.log(chalk.gray('╚══════════════════════════════\n'));
    }

    if (!body) return;

    const parsed = detectPrefix(body, config.prefix);
    if (!parsed) return;

    const args = parsed.body.trim().split(/\s+/).filter(Boolean);
    const command = args.shift()?.toLowerCase();

    if (!command) return;

    const plugin = plugins.get(command);

    if (!plugin) {
      return;
    }

    if (config.debug) {
      console.log(chalk.yellow(`⚡ Ejecutando comando: ${command}`));
    }

    const isOwner = Array.isArray(config.owner)
      ? config.owner.includes(number)
      : false;

    try {
      await plugin.execute({
        sock,
        msg,
        key,
        remoteJid,
        sender,
        botJid,
        pushName,
        body,
        args,
        command,
        store,
        config,
        db,

        fromMe,
        fromGroup,
        isOwner,
        isAdmin,
        isBotAdmin,
        groupMetadata,
        groupAdmins,

        reply: text => sock.sendMessage(
          remoteJid,
          { text: String(text) },
          { quoted: msg }
        )
      });

      if (config.debug) {
        console.log(chalk.green(`✅ Comando ejecutado correctamente: ${command}`));
      }

      try {
        await db.addXP(sender, Math.floor(Math.random() * 16) + 5);
      } catch (e) {
        console.log(chalk.yellow('⚠️ No se pudo guardar XP:'), e?.message || e);
      }

    } catch (e) {
      console.log(chalk.red(`❌ Error en comando ${command}:`));
      console.log(e?.stack || e);

      try {
        await sock.sendMessage(
          remoteJid,
          { text: '❌ Ocurrió un error ejecutando este comando.' },
          { quoted: msg }
        );
      } catch {}
    }

  } catch (err) {
    console.log(chalk.red('❌ Error en handler:'));
    console.log(err?.stack || err);
  }
}

module.exports = {
  messageHandler,
  loadPlugins,
  plugins
};
