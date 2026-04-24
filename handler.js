'use strict';

const path    = require('path');
const fs      = require('fs');
const chalk   = require('chalk');
const config  = require('./config');
const db      = require('./lib/database');

const {
  getBody,
  normalizeJid,
  detectPrefix,
  getGroupAdmins
} = require('./lib/utils');

// ═══════════════════════════════════════
// 📦 PLUGINS
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
      console.log(chalk.red(`Error plugin ${file}:`), e.message);
    }
  }

  console.log(chalk.green(`♻️ Plugins cargados: ${plugins.size}`));
}

// 🔥 GLOBAL PARA UPDATE
global.loadPlugins = loadPlugins;

// carga inicial
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

  const body = getBody(msg);
  if (!body) return;

  const parsed = detectPrefix(body);
  if (!parsed) return;

  const args = parsed.body.trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();
  if (!command) return;

  const plugin = plugins.get(command);
  if (!plugin) return;

  // ═══════════════════════════════════
  // 🔐 PERMISOS REALES
  // ═══════════════════════════════════

  const senderNum = sender.replace(/[^0-9]/g, '');
  const botNumber = (config.defaultPhone || '').replace(/[^0-9]/g, '');

  const isOwner =
    senderNum === botNumber ||
    (config.owner || []).includes(senderNum);

  let groupAdmins = [];

  if (fromGroup) {
    try {
      const metadata = await sock.groupMetadata(remoteJid);
      groupAdmins = getGroupAdmins(metadata.participants);
    } catch {}
  }

  const isAdmin = fromGroup
    ? groupAdmins.includes(sender) || isOwner
    : isOwner;

  const isPremium =
    (await db.isPremium?.(sender).catch(() => false)) || isOwner;

  // ═══════════════════════════════════
  // CONTEXTO FINAL
  // ═══════════════════════════════════

  const ctx = {
    sock,
    msg,
    remoteJid,
    sender,
    args,
    command,
    store,
    config,

    isOwner,
    isAdmin,
    isPremium
  };

  // ═══════════════════════════════════
  // EJECUCIÓN
  // ═══════════════════════════════════

  try {
    await plugin.execute(ctx);
  } catch (e) {
    console.log(chalk.red('Error plugin:'), e.message);
  }
}

module.exports = { messageHandler, loadPlugins };
