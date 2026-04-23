'use strict';

const path    = require('path');
const fs      = require('fs');
const chalk   = require('chalk');
const config  = require('./config');
const db      = require('./lib/database');

const {
  getBody, isGroup, getGroupAdmins, getBotJid, isBotAdmin,
  resolveLidSync, learnLidsFromParticipants, normalizeJid,
  detectPrefix,
} = require('./lib/utils');

// ───── SIN PLUGINS (vacío por ahora)
const plugins = new Map();

// ─────────────────────────────────────────────────────────────

async function messageHandler(sock, msg, store) {
  const { key, message, pushName } = msg;
  if (!message) return;

  const remoteJid = key.remoteJid;
  const fromGroup = isGroup(remoteJid);

  let sender = fromGroup ? key.participant : remoteJid;
  sender = normalizeJid(resolveLidSync(sender, store));

  const botJid = getBotJid(sock);
  if (sender === botJid || key.fromMe) return;

  const body = getBody(msg);
  if (!body) return;

  const senderNum = sender.split('@')[0];

  // ───────────── 🔥 LOG DE MENSAJES 🔥 ─────────────
  console.log(
    chalk.cyan('📩 Mensaje recibido'),
    '\n',
    chalk.yellow('👤 Nombre :'), pushName || 'Sin nombre',
    '\n',
    chalk.green('📞 Número :'), senderNum,
    '\n',
    chalk.magenta('💬 Mensaje:'), body,
    '\n',
    chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  );
  // ───────────────────────────────────────────────

  // (opcional) marcar como leído
  if (config.readMessages) {
    await sock.readMessages([key]).catch(() => {});
  }

  // ───── SI NO HAY PLUGINS, TERMINA AQUÍ ─────
  const parsed = detectPrefix(body);
  if (!parsed) return;

  const args    = parsed.body.trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();

  const plugin = plugins.get(command);
  if (!plugin) return;
}

module.exports = { messageHandler };
