'use strict';

const path    = require('path');
const fs      = require('fs');
const chalk   = require('chalk');
const config  = require('./config');
const db      = require('./lib/database');

const {
  getBody, isGroup, getGroupAdmins, getBotJid, isBotAdmin,
  normalizeJid,
  detectPrefix,
} = require('./lib/utils');

// ═══════════════════════════════════════
// 📦 CARGA DE PLUGINS
// ═══════════════════════════════════════

const PLUGINS_DIR = path.join(process.cwd(), 'plugins');

if (!fs.existsSync(PLUGINS_DIR)) {
  fs.mkdirSync(PLUGINS_DIR, { recursive: true });
}

const plugins = new Map();

function loadPlugins() {
  plugins.clear();

  const files = fs.readdirSync(PLUGINS_DIR).filter(f => f.endsWith('.js'));

  for (const file of files) {
    try {
      const filepath = path.join(PLUGINS_DIR, file);
      delete require.cache[require.resolve(filepath)];

      const plugin = require(filepath);
      const cmds = plugin.commands || [];

      for (const cmd of cmds) {
        plugins.set(cmd.toLowerCase(), plugin);
      }

    } catch (e) {
      console.log(chalk.red(`Error cargando plugin ${file}:`), e.message);
    }
  }

  console.log(chalk.green(`Plugins cargados: ${plugins.size}`));
}

loadPlugins();

// ═══════════════════════════════════════
// 🚀 HANDLER PRINCIPAL
// ═══════════════════════════════════════

async function messageHandler(sock, msg, store) {
  const { key, message, pushName } = msg;
  if (!message) return;

  const remoteJid = key.remoteJid;
  const fromGroup = isGroup(remoteJid);

  let sender = fromGroup ? key.participant : remoteJid;
  sender = normalizeJid(sender);

  const botJid = getBotJid(sock);
  if (sender === botJid || key.fromMe) return;

  const body = getBody(msg);
  if (!body) return;

  const senderNum = sender.split('@')[0];
  const isOwner = config.owner.includes(senderNum) || config.rowner.includes(senderNum);


  // 📛 Nombre correcto
  const contact = store?.contacts?.[sender] || {};
const name = pushName || contact.name || contact.notify || senderNum;
  
  // 📝 LOG
  console.log(
    chalk.cyan('📩 Mensaje recibido'),
    '\n',
    chalk.yellow('👤 Nombre :'), name,
    '\n',
    chalk.green('📞 Número :'), senderNum,
    '\n',
    chalk.magenta('💬 Mensaje:'), body,
    '\n',
    chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  );

  if (config.readMessages) {
    await sock.readMessages([key]).catch(() => {});
  }

  // ───── COMANDOS ─────

const parsed = detectPrefix(body);
if (!parsed) return;
  
const args    = parsed.body.trim().split(/\s+/);
const command = args.shift()?.toLowerCase();
if (!command) return;

const plugin = plugins.get(command);
if (!plugin) return;

const ctx = {
  sock,
  msg,
  remoteJid,
  sender,
  senderNum,
  args,
  command,
  store,
  config,
  isOwner // 👈 IMPORTANTE
};

  try {
    await plugin.execute(ctx);
  } catch (e) {
    console.log(chalk.red('Error en plugin:'), e.message);
  }
}

module.exports = { messageHandler, loadPlugins };
