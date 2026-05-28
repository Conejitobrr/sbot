'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const db = require('../lib/database');
const config = require('../config');

const DEFAULT_PROFILE = path.join(process.cwd(), 'assets', 'Sinperfil.jpg');
const JAIL_PATH = path.join(process.cwd(), 'lib', 'jail.json');
const MARRIAGE_PATH = path.join(process.cwd(), 'lib', 'marriages.json');

function cleanJid(jid = '') {
  return String(jid).split(':')[0];
}

function cleanNumber(jid = '') {
  return cleanJid(jid)
    .split('@')[0]
    .replace(/\D/g, '');
}

function getMentioned(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
}

function getTarget(msg, sender) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;

  if (quoted) return cleanJid(quoted);

  const mentioned = getMentioned(msg)[0];

  if (mentioned) return cleanJid(mentioned);

  return cleanJid(sender);
}

function loadJson(file, fallback = {}) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8') || '{}');
  } catch {
    return fallback;
  }
}

function msToTime(ms = 0) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);

  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function isOwnerUser(jid = '') {
  const number = cleanNumber(jid);

  const owners = Array.isArray(config.owner)
    ? config.owner.map(n => String(n).replace(/\D/g, ''))
    : [];

  return owners.includes(number);
}

function isPremiumUser(user = {}) {
  return (
    user?.premium === true ||
    user?.isPremium === true ||
    Number(user?.premiumUntil || 0) > Date.now()
  );
}

function isJailed(jid = '') {
  const data = loadJson(JAIL_PATH, { jailed: {}, fame: {} });
  const jail = data.jailed?.[cleanJid(jid)];

  if (!jail) {
    return {
      jailed: false,
      time: ''
    };
  }

  const left = Number(jail.until || 0) - Date.now();

  if (left <= 0) {
    return {
      jailed: false,
      time: ''
    };
  }

  return {
    jailed: true,
    time: msToTime(left)
  };
}

function getFame(jid = '') {
  const data = loadJson(JAIL_PATH, { jailed: {}, fame: {} });
  return Number(data.fame?.[cleanJid(jid)] || 0);
}

function hasPartner(jid = '') {
  const data = loadJson(MARRIAGE_PATH, { marriages: {} });
  return !!data.marriages?.[cleanJid(jid)]?.partner;
}

async function getProfileBuffer(sock, jid) {
  try {
    const url = await sock.profilePictureUrl(jid, 'image');

    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 15000
    });

    return Buffer.from(res.data);

  } catch {
    if (fs.existsSync(DEFAULT_PROFILE)) {
      return fs.readFileSync(DEFAULT_PROFILE);
    }

    throw new Error('No existe assets/Sinperfil.jpg');
  }
}

module.exports = {
  commands: ['perfil', 'profile', 'me'],

  async execute({ sock, remoteJid, msg, sender }) {
    try {
      const target = getTarget(msg, sender);
      const user = await db.getUser(target);

      const premium = isPremiumUser(user);
      const owner = isOwnerUser(target);
      const jail = isJailed(target);
      const fame = getFame(target);
      const partner = hasPartner(target);

      const xp = Number(user.xp || 0);
      const level = Number(user.level || 1);

      const image = await getProfileBuffer(sock, target);

      const text =
`👤 *PERFIL DE USUARIO*

👤 Usuario: @${cleanNumber(target)}
⭐ XP: *${xp}*
🏆 Nivel: *${level}*
💎 Premium: *${premium ? 'Sí' : 'No'}*
👑 Owner: *${owner ? 'Sí' : 'No'}*
🚫 Baneado: *${user.banned === true ? 'Sí' : 'No'}*

⛓️ Arrestado: *${jail.jailed ? 'Sí' : 'No'}*
${jail.jailed ? `⏳ Tiempo restante: *${jail.time}*\n` : ''}☠️ Fama criminal: *${fame}*
💍 Pareja: *${partner ? 'Sí' : 'No'}*`;

      return sock.sendMessage(remoteJid, {
        image,
        caption: text,
        mentions: [target]
      }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error en perfil:', err?.message || err);

      return sock.sendMessage(remoteJid, {
        text: '❌ Error mostrando el perfil.'
      }, { quoted: msg });
    }
  }
};
