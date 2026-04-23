'use strict';

// ╔════════════════════════════════════════════╗
// ║        🌌 SIRIUSBOT — HANDLER             ║
// ╚════════════════════════════════════════════╝

const config = require('./config');
const db     = require('./lib/database');
const {
  getBody,
  isGroup,
  getGroupAdmins,
  getBotJid,
  isBotAdmin,
  resolveLidSync,
  learnLidsFromParticipants,
  normalizeJid,
  detectPrefix
} = require('./lib/utils');

// ─────────────────────────────────────────────
// 🚀 HANDLER PRINCIPAL
// ─────────────────────────────────────────────

async function messageHandler(sock, msg, store) {
  const { key, message, pushName } = msg;
  if (!message) return;

  const remoteJid = key.remoteJid;
  const fromGroup = isGroup(remoteJid);

  let sender = fromGroup ? key.participant : remoteJid;
  sender = normalizeJid(resolveLidSync(sender, store));

  const botJid = getBotJid(sock);
  if (sender === botJid || key.fromMe) return;

  // 🚫 Usuario baneado
  if (await db.isBanned(sender)) return;

  const body = getBody(msg);
  if (!body) return;

  // ─────────────────────────────
  // 🖨️ LOG DE MENSAJES
  // ─────────────────────────────
  const senderNumber = sender.split('@')[0];
  const name = pushName || 'Sin nombre';

  console.log(`
═══════════════════════════════
📩 MENSAJE RECIBIDO
═══════════════════════════════
👤 Nombre : ${name}
📱 Número : ${senderNumber}
💬 Mensaje: ${body}
${fromGroup ? '👥 Grupo  : Sí' : '👤 Chat privado'}
═══════════════════════════════
`);

  // ── Grupo ─────────────────────────────────
  let groupAdmins = [];
  let botIsAdmin  = false;

  if (fromGroup) {
    try {
      const metadata = await sock.groupMetadata(remoteJid);
      await learnLidsFromParticipants(metadata.participants);
      groupAdmins = getGroupAdmins(metadata.participants);
      botIsAdmin  = isBotAdmin(sock, groupAdmins);
    } catch {}
  }

  // ── Prefijo ───────────────────────────────
  const parsed = detectPrefix(body);
  if (!parsed) return;

  const args    = parsed.body.split(/\s+/);
  const command = args.shift()?.toLowerCase();

  if (!command) return;

  // ─────────────────────────────────────────
  // 📦 CONTEXTO
  // ─────────────────────────────────────────
  const ctx = {
    sock,
    msg,
    remoteJid,
    sender,
    fromGroup,
    pushName: pushName || senderNumber,
    args,
    command,
    prefix: parsed.prefix || '!',
    groupAdmins,
    botIsAdmin,

    reply: (text) => sock.sendMessage(remoteJid, { text }, { quoted: msg }),
    react: (emoji) => sock.sendMessage(remoteJid, { react: { text: emoji, key: msg.key } })
  };

  // ─────────────────────────────────────────
  // 🎯 COMANDOS BÁSICOS
  // ─────────────────────────────────────────

  try {
    await ctx.react('⏳');

    switch (command) {

      case 'ping':
        return ctx.reply('🏓 Pong! SiriusBot activo.');

      case 'menu':
        return ctx.reply(
`🌌 *SiriusBot*

Comandos disponibles:
• !ping
• !menu
• !owner`
        );

      case 'owner':
        return ctx.reply(`👤 Owner: ${config.rowner[0]}`);

      case 'ban':
        if (!config.rowner.includes(senderNumber)) {
          return ctx.reply('❌ Solo el owner puede usar esto');
        }
        if (!args[0]) return ctx.reply('⚠️ Usa: !ban numero');

        await db.banUser(args[0] + '@s.whatsapp.net');
        return ctx.reply('🚫 Usuario baneado');

      case 'unban':
        if (!config.rowner.includes(senderNumber)) {
          return ctx.reply('❌ Solo el owner puede usar esto');
        }
        if (!args[0]) return ctx.reply('⚠️ Usa: !unban numero');

        await db.unbanUser(args[0] + '@s.whatsapp.net');
        return ctx.reply('✅ Usuario desbaneado');

      default:
        return;
    }

  } catch (err) {
    console.error('[HANDLER ERROR]', err);
    await ctx.react('❌');
    ctx.reply('⚠️ Error ejecutando el comando');
  }
}

// ─────────────────────────────────────────────
// 📤 EXPORT
// ─────────────────────────────────────────────

module.exports = { messageHandler };
