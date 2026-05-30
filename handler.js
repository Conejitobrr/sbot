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

const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

function shouldHideConsole(args = []) {
  const text = args.map(v => {
    try {
      if (typeof v === 'object') return JSON.stringify(v);
      return String(v);
    } catch {
      return String(v);
    }
  }).join(' ');

  const blocked = [
    'Closing session',
    'Closing stale open session',
    'Closing open session',
    'SessionEntry',
    '_chains',
    'Removing old closed session',
    'chainKey',
    'ephemeralKeyPair',
    'rootKey',
    'indexInfo',
    'registrationId',
    'currentRatchet',
    'pendingPreKey',
    'messageKeys',
    'remoteIdentityKey'
  ];

  return blocked.some(word => text.includes(word));
}

console.log = (...args) => {
  if (shouldHideConsole(args)) return;
  originalConsoleLog(...args);
};

console.error = (...args) => {
  if (shouldHideConsole(args)) return;
  originalConsoleError(...args);
};

console.warn = (...args) => {
  if (shouldHideConsole(args)) return;
  originalConsoleWarn(...args);
};

function attachSendLogger(sock) {
  if (sock._loggerAttached) return;
  sock._loggerAttached = true;

  const originalSend = sock.sendMessage.bind(sock);

  sock.sendMessage = async (jid, content = {}, options = {}) => {
    try {
      if (config.debug) {
        let type = 'Desconocido';
        let preview = '';

        if (content.text) {
          type = 'Texto';
          preview = content.text;
        } else if (content.image) {
          type = 'Imagen';
          preview = content.caption || '[Imagen]';
        } else if (content.video) {
          type = 'Video';
          preview = content.caption || '[Video]';
        } else if (content.audio) {
          type = content.ptt ? 'Nota de voz' : 'Audio';
          preview = '[Audio]';
        } else if (content.sticker) {
          type = 'Sticker';
          preview = '[Sticker]';
        } else if (content.document) {
          type = 'Documento';
          preview = content.fileName || '[Documento]';
        }

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

function getPluginsDir() {
  const plugin = path.join(process.cwd(), 'plugin');
  const plugins = path.join(process.cwd(), 'plugins');

  if (fs.existsSync(plugin)) return plugin;
  if (fs.existsSync(plugins)) return plugins;

  fs.mkdirSync(plugin, { recursive: true });
  return plugin;
}

const PLUGINS_DIR = getPluginsDir();
const plugins = new Map();
const messagePlugins = [];

function loadPlugins() {
  plugins.clear();
  messagePlugins.length = 0;

  const files = fs
    .readdirSync(PLUGINS_DIR)
    .filter(file => file.endsWith('.js'));

  let commandFiles = 0;
  let eventFiles = 0;

  for (const file of files) {
    try {
      const filepath = path.join(PLUGINS_DIR, file);

      delete require.cache[require.resolve(filepath)];

      const plugin = require(filepath);

      if (!plugin) {
        console.log(chalk.yellow(`⚠️ Plugin ignorado ${file}: vacío`));
        continue;
      }

      if (typeof plugin.onMessage === 'function') {
        messagePlugins.push({
          ...plugin,
          file
        });
        eventFiles++;
      }

      if (typeof plugin.execute === 'function') {
        const commands = Array.isArray(plugin.commands) ? plugin.commands : [];

        if (!commands.length) {
          console.log(chalk.yellow(`⚠️ Plugin comando ignorado ${file}: no tiene commands`));
        } else {
          for (const cmd of commands) {
            plugins.set(String(cmd).toLowerCase(), {
              ...plugin,
              file
            });
          }

          commandFiles++;
        }
      }

      if (typeof plugin.execute !== 'function' && typeof plugin.onMessage !== 'function') {
        console.log(chalk.yellow(`⚠️ Plugin ignorado ${file}: falta execute() u onMessage()`));
      }

    } catch (err) {
      console.log(chalk.red(`❌ Error cargando plugin ${file}:`), err?.message || err);
    }
  }

  console.log(chalk.green(`♻️ Plugins cargados: ${plugins.size} comandos en ${commandFiles} archivos`));
  console.log(chalk.green(`🎧 Plugins onMessage cargados: ${messagePlugins.length} en ${eventFiles} archivos`));
}

global.loadPlugins = loadPlugins;
loadPlugins();

function cleanNumber(jid = '') {
  return String(jid)
    .split('@')[0]
    .split(':')[0]
    .replace(/\D/g, '');
}

// ✅ DETECCIÓN MEJORADA PARA CONSOLA
function isObject(value) {
  return value && typeof value === 'object';
}

function hasMediaMessage(message = {}) {
  return (
    message.imageMessage ||
    message.videoMessage ||
    message.audioMessage ||
    message.ptvMessage ||
    message.stickerMessage ||
    message.documentMessage ||
    message.locationMessage ||
    message.contactMessage ||
    message.contactsArrayMessage ||
    message.reactionMessage
  );
}

function hasViewOnceDeep(node, depth = 0, seen = new Set()) {
  if (!isObject(node)) return false;
  if (depth > 12) return false;
  if (seen.has(node)) return false;

  seen.add(node);

  const keys = Object.keys(node);

  if (keys.some(k => String(k).toLowerCase().includes('viewonce'))) {
    return true;
  }

  if (
    node.imageMessage?.viewOnce === true ||
    node.videoMessage?.viewOnce === true ||
    node.audioMessage?.viewOnce === true ||
    node.ptvMessage?.viewOnce === true
  ) {
    return true;
  }

  for (const key of keys) {
    const value = node[key];

    if (isObject(value)) {
      if (hasViewOnceDeep(value, depth + 1, seen)) return true;
    }
  }

  return false;
}

function findMediaDeep(node, isOnce = false, depth = 0, seen = new Set()) {
  if (!isObject(node)) return null;
  if (depth > 12) return null;
  if (seen.has(node)) return null;

  seen.add(node);

  const keys = Object.keys(node);

  const nowOnce =
    isOnce ||
    keys.some(k => String(k).toLowerCase().includes('viewonce')) ||
    node.imageMessage?.viewOnce === true ||
    node.videoMessage?.viewOnce === true ||
    node.audioMessage?.viewOnce === true ||
    node.ptvMessage?.viewOnce === true;

  if (hasMediaMessage(node)) {
    return {
      message: node,
      isOnce: nowOnce
    };
  }

  for (const key of keys) {
    const value = node[key];

    if (!isObject(value)) continue;

    const found = findMediaDeep(
      value,
      nowOnce || key.toLowerCase().includes('viewonce'),
      depth + 1,
      seen
    );

    if (found) return found;
  }

  return null;
}

function getMessageKeysPreview(message = {}) {
  try {
    const keys = Object.keys(message || {});

    if (!keys.length) return 'sin keys';

    return keys.slice(0, 8).join(', ');
  } catch {
    return 'error leyendo keys';
  }
}

function getReadableMessage(msg) {
  const message = msg.message || {};
  const found = findMediaDeep(message);
  const hasOnce = hasViewOnceDeep(message);

  const m = found?.message || message;
  const once = found?.isOnce || hasOnce ? ' de 1 sola vez' : '';

  // ✅ Primero detectar archivos de 1 sola vez, aunque tengan caption/texto
  if (found?.isOnce || hasOnce) {
    if (m.imageMessage) return `[Imagen${once}]`;
    if (m.videoMessage) return m.videoMessage.gifPlayback ? `[GIF${once}]` : `[Video${once}]`;
    if (m.ptvMessage) return `[Video circular${once}]`;
    if (m.stickerMessage) return `[Sticker${once}]`;
    if (m.audioMessage) return m.audioMessage.ptt ? `[Nota de voz${once}]` : `[Audio${once}]`;
    if (m.documentMessage) return `[Documento${once}]`;

    return '[Archivo de 1 sola vez]';
  }

  const body = getBody(msg);
  if (body) return body;

  if (m.imageMessage) return '[Imagen]';
  if (m.videoMessage) return m.videoMessage.gifPlayback ? '[GIF]' : '[Video]';
  if (m.ptvMessage) return '[Video circular]';
  if (m.stickerMessage) return '[Sticker]';
  if (m.audioMessage) return m.audioMessage.ptt ? '[Nota de voz]' : '[Audio]';
  if (m.documentMessage) return '[Documento]';
  if (m.locationMessage) return '[Ubicación]';
  if (m.contactMessage) return '[Contacto]';
  if (m.contactsArrayMessage) return '[Contactos]';
  if (m.reactionMessage) return '[Reacción]';

  return `[Sin texto | keys: ${getMessageKeysPreview(message)}]`;
}

async function safeGroupMetadata(sock, jid) {
  try {
    return await sock.groupMetadata(jid);
  } catch {
    return null;
  }
}

// ⛓️ SISTEMA DE CÁRCEL
const JAIL_PATH = path.join(process.cwd(), 'lib', 'jail.json');

function msToTime(ms = 0) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m} min ${s} seg`;
}

function loadJailDB() {
  try {
    if (!fs.existsSync(JAIL_PATH)) {
      return { jailed: {}, fame: {} };
    }

    return JSON.parse(fs.readFileSync(JAIL_PATH, 'utf8') || '{}');
  } catch {
    return { jailed: {}, fame: {} };
  }
}

function saveJailDB(data) {
  try {
    const dir = path.dirname(JAIL_PATH);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(JAIL_PATH, JSON.stringify(data, null, 2));
  } catch {}
}

function checkJail(jid) {
  const data = loadJailDB();

  data.jailed = data.jailed || {};

  const clean = String(jid || '').split(':')[0];
  const jail = data.jailed[clean];

  if (!jail) return null;

  if (Number(jail.until || 0) <= Date.now()) {
    delete data.jailed[clean];
    saveJailDB(data);
    return null;
  }

  return jail;
}

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
    const userKey = number;

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

    const ownerNumbers = Array.isArray(config.owner)
      ? config.owner.map(n => String(n).replace(/\D/g, ''))
      : [];

    const senderNumber = cleanNumber(sender);
    const remoteNumber = cleanNumber(remoteJid);
    const participantNumber = cleanNumber(key.participant || '');
    const realNumber = cleanNumber(msg.realNumber || '');

    const isOwner =
      fromMe ||
      ownerNumbers.includes(senderNumber) ||
      ownerNumbers.includes(remoteNumber) ||
      ownerNumbers.includes(participantNumber) ||
      ownerNumbers.includes(realNumber);

    if (config.debug) {
      console.log(chalk.gray('\n╔══════════════════════════════'));
      console.log(chalk.white('║ 📍 Tipo   :'), chatLabel);
      console.log(chalk.white('║ 🏷️ Chat   :'), chalk.cyan(chatName));
      console.log(chalk.white('║ 👤 Nombre :'), chalk.green(pushName));
      console.log(chalk.white('║ 📞 Número :'), chalk.yellow(number ? `+${number}` : 'Desconocido'));
      console.log(chalk.white('║ 👑 Owner  :'), chalk.yellow(isOwner ? 'Sí' : 'No'));
      console.log(chalk.white('║ 💬 Msg    :'), chalk.white(String(displayMsg).slice(0, 300)));
      console.log(chalk.gray('╚══════════════════════════════\n'));
    }

    // 🔥 Ejecutar plugins onMessage aunque no sea comando
    if (messagePlugins.length) {
      for (const plugin of messagePlugins) {
        try {
          await plugin.onMessage({
            sock,
            msg,
            key,
            remoteJid,
            sender,
            botJid,
            pushName,
            body,
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
        } catch (e) {
          console.log(chalk.red(`❌ Error en onMessage ${plugin.file}:`), e?.message || e);
        }
      }
    }

    if (!body) return;

    const parsed = detectPrefix(body, config.prefix);
    if (!parsed) return;

    const args = parsed.body.trim().split(/\s+/).filter(Boolean);
    const command = args.shift()?.toLowerCase();

    if (!command) return;

    const plugin = plugins.get(command);
    if (!plugin) return;

    // 🚫 BLOQUEAR USUARIOS BANEADOS
    if (!isOwner) {
      const banned = await db.isBanned(sender);

      if (banned) {
        return sock.sendMessage(remoteJid, {
          text: '🚫 Estás baneado del bot.\n\nNo puedes usar comandos.'
        }, { quoted: msg });
      }
    }

    // ⛓️ BLOQUEAR COMANDOS SI ESTÁ ARRESTADO
    const jail = checkJail(sender);

    if (jail && !isOwner && !['sobornar', 'fianza', 'usar', 'llave', 'inventario'].includes(command)) {
      return sock.sendMessage(remoteJid, {
        text:
`⛓️ *ESTÁS ARRESTADO*

No puedes usar comandos del bot por ahora.

⏳ Tiempo restante: *${msToTime(jail.until - Date.now())}*
💸 Usa *.sobornar* para intentar salir antes.`
      }, { quoted: msg });
    }

    if (!isOwner) {
      if (fromGroup) {
        const groupData = await db.getGroup(remoteJid);

        if (groupData.bot === false && !['enable', 'menu', 'help'].includes(command)) {
          return;
        }
      } else {
        const userData = await db.getUser(userKey);

        if (userData.bot === false && !['enable', 'menu', 'help'].includes(command)) {
          return;
        }
      }
    }

    if (config.debug) {
      console.log(chalk.yellow(`⚡ Ejecutando comando: ${command}`));
    }

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
  plugins,
  messagePlugins
};
