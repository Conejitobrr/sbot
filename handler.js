'use strict';

const path    = require('path');
const fs      = require('fs');
const chalk   = require('chalk');
const config  = require('./config');
const db      = require('./lib/database');

const {
  getBody, isGroup, getGroupAdmins, getBotJid,
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
  const fromGroup = remoteJid?.endsWith('@g.us');

  let sender = fromGroup ? key.participant : remoteJid;
  sender = normalizeJid(sender);

  const isFromMe = key.fromMe;

  const body = getBody(msg);
  if (!body) return;

  const parsed = detectPrefix(body);

  // Permitir comandos propios
  if (isFromMe && !parsed) return;

  // ── PERMISOS ─────────────────────────
  const senderNum = sender.replace(/[^0-9]/g, '');

  const botNumber = sock.user.id.split(':')[0];

  const isRowner = (config.rowner || []).includes(senderNum);

  const isOwner =
    senderNum === botNumber ||
    (config.owner || []).includes(senderNum) ||
    isRowner;

  let groupAdmins = [];
  if (fromGroup) {
    try {
      const metadata = await sock.groupMetadata(remoteJid);
      groupAdmins = getGroupAdmins(metadata.participants);
    } catch {}
  }

  const isAdmin = groupAdmins.includes(sender) || isOwner;

  // 🔥 PREMIUM
  const isPremium =
    (await db.isPremium?.(sender).catch(() => false)) || isOwner;

  const contact = store?.contacts?.[sender] || {};
  const name = pushName || contact.name || contact.notify || senderNum;

  // 📝 LOG
  console.log(
    chalk.cyan('📩 Mensaje'),
    '\n',
    chalk.yellow('👤'), name,
    '\n',
    chalk.green('📞'), senderNum,
    '\n',
    chalk.magenta('💬'), body,
    '\n',
    chalk.gray('━━━━━━━━━━━━━━━━━━')
  );

  if (config.readMessages) {
    await sock.readMessages([key]).catch(() => {});
  }

  // ───── COMANDOS ─────

  if (!parsed) return;

  const args    = parsed.body.trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();
  if (!command) return;

  const plugin = plugins.get(command);
  if (!plugin) return;

  // 🔥 CONTEXTO COMPLETO
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

    // permisos
    isOwner,
    isAdmin,
    isPremium
  };

  try {
    await plugin.execute(ctx);
  } catch (e) {
    console.log(chalk.red('Error en plugin:'), e.message);
  }
}

module.exports = { messageHandler, loadPlugins };
