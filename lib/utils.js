'use strict';

// ╔══════════════════════════════════════════════════════════════════════╗
// ║                 🌸 SIRIUSBOT — UTILS LIMPIO 🌸                      ║
// ╚══════════════════════════════════════════════════════════════════════╝

let _store = null;

// ═══════════════════════════════════════
// STORE
// ═══════════════════════════════════════

function setStore(store) { _store = store; }
function getStore()      { return _store; }

// ═══════════════════════════════════════
// JID / USUARIOS
// ═══════════════════════════════════════

function normalizeJid(jid) {
  if (!jid) return '';
  if (jid.includes(':') && jid.endsWith('@s.whatsapp.net')) {
    return jid.split(':')[0] + '@s.whatsapp.net';
  }
  return jid;
}

function getDisplayNumber(jid) {
  if (!jid) return 'Desconocido';
  return jid.split('@')[0];
}

// ═══════════════════════════════════════
// MENSAJES
// ═══════════════════════════════════════

function getBody(msg) {
  const m = msg.message;
  if (!m) return '';

  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    ''
  );
}

function getMsgType(msg) {
  const m = msg.message;
  if (!m) return '';
  return Object.keys(m)[0] || '';
}

// ═══════════════════════════════════════
// GRUPOS
// ═══════════════════════════════════════

function isGroup(jid) {
  return jid?.endsWith('@g.us') || false;
}

function getGroupAdmins(participants = []) {
  return participants
    .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
    .map(p => normalizeJid(p.id));
}

function getBotJid(sock) {
  if (!sock?.user?.id) return '';
  return normalizeJid(sock.user.id);
}

function isBotAdmin(sock, groupAdmins) {
  return groupAdmins.includes(getBotJid(sock));
}
// ══════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════
// PREFIJOS / COMANDOS
// ═══════════════════════════════════════

function detectPrefix(text) {
  if (!text) return null;

  const prefixes = ['.', '!', '/', '#']; // puedes cambiar esto

  const prefix = prefixes.find(p => text.startsWith(p));
  if (!prefix) return null;

  return {
    prefix,
    body: text.slice(prefix.length).trim()
  };
}
// ═══════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatUptime(ms) {
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const hr  = Math.floor(min / 60);

  if (hr > 0) return `${hr}h ${min % 60}m`;
  if (min > 0) return `${min}m ${sec % 60}s`;
  return `${sec}s`;
}

// ═══════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════

module.exports = {
  setStore, getStore,
  normalizeJid, getDisplayNumber,
  getBody, getMsgType,
  isGroup, getGroupAdmins, getBotJid, isBotAdmin,
  sleep, getRandom, formatUptime,

  // 👇 IMPORTANTE
  detectPrefix
};
