'use strict';

let _store = null;

function setStore(store) {
  _store = store;
}

function getStore() {
  return _store;
}

function normalizeJid(jid = '') {
  if (!jid || typeof jid !== 'string') return '';

  if (jid.includes(':')) {
    const [user, domain] = jid.split('@');
    return user.split(':')[0] + '@' + domain;
  }

  return jid;
}

function cleanNumber(jid = '') {
  return String(jid)
    .split('@')[0]
    .split(':')[0]
    .replace(/\D/g, '');
}

function getDisplayNumber(jid = '') {
  const number = cleanNumber(jid);
  return number ? `+${number}` : 'Desconocido';
}

function isGroup(jid = '') {
  return jid.endsWith('@g.us');
}

function getBotJid(sock) {
  return normalizeJid(sock?.user?.id || '');
}

function unwrapMessage(message = {}) {
  if (message.ephemeralMessage) {
    return message.ephemeralMessage.message || {};
  }

  if (message.viewOnceMessage) {
    return message.viewOnceMessage.message || {};
  }

  if (message.viewOnceMessageV2) {
    return message.viewOnceMessageV2.message || {};
  }

  if (message.documentWithCaptionMessage) {
    return message.documentWithCaptionMessage.message || {};
  }

  return message;
}

function getBody(msg = {}) {
  const m = unwrapMessage(msg.message || {});
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

function getMsgType(msg = {}) {
  const m = unwrapMessage(msg.message || {});
  return Object.keys(m || {})[0] || '';
}

function getQuotedMessage(msg = {}) {
  const m = unwrapMessage(msg.message || {});

  return (
    m.extendedTextMessage?.contextInfo?.quotedMessage ||
    m.imageMessage?.contextInfo?.quotedMessage ||
    m.videoMessage?.contextInfo?.quotedMessage ||
    m.documentMessage?.contextInfo?.quotedMessage ||
    null
  );
}

function getQuotedParticipant(msg = {}) {
  const m = unwrapMessage(msg.message || {});

  return (
    m.extendedTextMessage?.contextInfo?.participant ||
    m.imageMessage?.contextInfo?.participant ||
    m.videoMessage?.contextInfo?.participant ||
    m.documentMessage?.contextInfo?.participant ||
    ''
  );
}

function extractAdmins(participants = []) {
  return participants
    .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
    .map(p => normalizeJid(p.id));
}

async function getGroupAdmins(sockOrParticipants, jid = '') {
  if (Array.isArray(sockOrParticipants)) {
    return extractAdmins(sockOrParticipants);
  }

  const sock = sockOrParticipants;

  if (!sock || !jid) return [];

  try {
    const metadata = await sock.groupMetadata(jid);
    return extractAdmins(metadata.participants || []);
  } catch {
    return [];
  }
}

function isBotAdmin(sock, groupAdmins = []) {
  return groupAdmins.includes(getBotJid(sock));
}

// ✅ SOLO ACEPTA EL PREFIJO DE config.js
function detectPrefix(text = '', customPrefix = '.') {
  if (!text || typeof text !== 'string') return null;

  const prefixes = Array.isArray(customPrefix)
    ? customPrefix
    : [customPrefix];

  const prefix = prefixes.find(p => p && text.startsWith(p));
  if (!prefix) return null;

  return {
    prefix,
    body: text.slice(prefix.length).trim()
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandom(arr = []) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickRandom(arr = []) {
  return getRandom(arr);
}

function formatUptime(ms = 0) {
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  if (day > 0) return `${day}d ${hr % 24}h ${min % 60}m`;
  if (hr > 0) return `${hr}h ${min % 60}m`;
  if (min > 0) return `${min}m ${sec % 60}s`;
  return `${sec}s`;
}

function clockString(ms = 0) {
  return formatUptime(ms);
}

function isUrl(text = '') {
  return /^https?:\/\//i.test(text);
}

function toBool(value) {
  return value === true || value === 'true' || value === '1' || value === 1;
}

module.exports = {
  setStore,
  getStore,

  normalizeJid,
  cleanNumber,
  getDisplayNumber,
  isGroup,
  getBotJid,

  unwrapMessage,
  getBody,
  getMsgType,
  getQuotedMessage,
  getQuotedParticipant,

  getGroupAdmins,
  isBotAdmin,

  detectPrefix,

  sleep,
  getRandom,
  pickRandom,
  formatUptime,
  clockString,
  isUrl,
  toBool
};
