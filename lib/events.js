'use strict';

const fs = require('fs');
const path = require('path');
const db = require('./database');

const state = {
  active: null,
  messages: {},
  timer: null,
  initialized: false
};

const PROFILE_CACHE_TTL = 1000 * 60 * 30;
const profileCache = new Map();

const DEFAULT_PFP = fs.existsSync(path.resolve(process.cwd(), 'asset/Sinperfil.jpg'))
  ? path.resolve(process.cwd(), 'asset/Sinperfil.jpg')
  : path.resolve(process.cwd(), 'assets/Sinperfil.jpg');

const CFG = {
  minInterval: 10 * 60 * 1000,
  maxInterval: 20 * 60 * 1000,
  duration: 60 * 1000,
  activityThreshold: 25
};

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr = []) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function now() {
  return Date.now();
}

function getState() {
  return state.active;
}

function isActive(type = '') {
  if (!state.active) return false;
  if (!type) return true;
  return state.active.type === type;
}

function getMultiplier() {
  if (state.active?.type === 'double') return 2;
  return 1;
}

function init(sock) {
  if (!sock || state.initialized) return;

  state.initialized = true;

  sock.ev.on('group-participants.update', async update => {
    try {
      await onParticipantsUpdate(sock, update);
    } catch (e) {
      console.log('❌ Error en welcome/goodbye:', e?.message || e);
    }
  });

  scheduleNext(sock);
}

function scheduleNext(sock) {
  if (state.timer) clearTimeout(state.timer);

  const delay = rand(CFG.minInterval, CFG.maxInterval);

  state.timer = setTimeout(() => {
    maybeStartEvent(sock).catch(() => scheduleNext(sock));
  }, delay);
}

async function maybeStartEvent(sock, groupId = null) {
  if (state.active) return;

  const type = pick(['bonus', 'rob', 'trivia', 'double']);

  state.active = {
    type,
    groupId,
    endsAt: now() + CFG.duration,
    answer: type === 'trivia' ? String(rand(1, 10)) : null,
    winner: null
  };

  if (groupId) {
    await announceEvent(sock, state.active);
  }

  setTimeout(() => finishEvent(sock), CFG.duration + 1000);
}

async function onMessage(ctx) {
  const { sock, remoteJid, body, sender, pushName, fromGroup } = ctx;

  if (!fromGroup || !remoteJid) return;

  state.messages[remoteJid] = (state.messages[remoteJid] || 0) + 1;

  if (!state.active && state.messages[remoteJid] >= CFG.activityThreshold) {
    state.messages[remoteJid] = 0;
    await maybeStartEvent(sock, remoteJid);
  }

  if (!state.active || state.active.groupId !== remoteJid) return;
  if (now() > state.active.endsAt) return;

  const text = String(body || '').toLowerCase().trim();

  if (state.active.type === 'bonus' && text === 'yo' && !state.active.winner) {
    state.active.winner = sender;

    const gain = rand(25, 60);
    await db.addXP(sender, gain);

    await sock.sendMessage(remoteJid, {
      text: `🎉 ${pushName} ganó +${gain} XP`
    });

    return endEvent(sock);
  }

  if (state.active.type === 'rob' && text === 'robaxp' && !state.active.winner) {
    state.active.winner = sender;

    const bonus = rand(10, 30);
    await db.addXP(sender, bonus);

    await sock.sendMessage(remoteJid, {
      text: `😈 ${pushName} obtuvo +${bonus} XP`
    });

    return endEvent(sock);
  }

  if (state.active.type === 'trivia' && text === state.active.answer && !state.active.winner) {
    state.active.winner = sender;

    const gain = rand(40, 80);
    await db.addXP(sender, gain);

    await sock.sendMessage(remoteJid, {
      text: `🏆 ${pushName} acertó. +${gain} XP`
    });

    return endEvent(sock);
  }

  if (state.active.type === 'double' && text === 'doble' && !state.active.winner) {
    state.active.winner = sender;

    await sock.sendMessage(remoteJid, {
      text: `⚡ ${pushName} activó el evento de doble XP.`
    });

    return endEvent(sock);
  }
}

async function announceEvent(sock, ev) {
  if (!ev?.groupId) return;

  const seconds = Math.floor(CFG.duration / 1000);

  const text = {
    bonus: `💰 *Bonus activo*\n\nEscribe *yo* para ganar XP.\n⏳ Tienes ${seconds}s`,
    rob: `😈 *Robo global activo*\n\nEscribe *robaxp* para ganar XP.\n⏳ Tienes ${seconds}s`,
    trivia: `🎯 *Trivia activa*\n\nAdivina el número del *1 al 10*.\n⏳ Tienes ${seconds}s`,
    double: `⚡ *Doble XP activo*\n\nEscribe *doble* para activar doble XP.\n⏳ Tienes ${seconds}s`
  }[ev.type];

  await sock.sendMessage(ev.groupId, { text });
}

async function endEvent(sock) {
  state.active = null;
  scheduleNext(sock);
}

async function finishEvent(sock) {
  if (!state.active) return;

  const { groupId, winner } = state.active;

  if (groupId && !winner) {
    await sock.sendMessage(groupId, {
      text: '⏱️ Tiempo terminado. Nadie ganó 😶'
    });
  }

  state.active = null;
  scheduleNext(sock);
}

async function getProfilePictureWithRetry(sock, user, retries = 2) {
  const cached = profileCache.get(user);

  if (cached && cached.expires > Date.now()) {
    return cached.url;
  }

  for (let i = 0; i < retries; i++) {
    try {
      const url = await sock.profilePictureUrl(user, 'image');

      profileCache.set(user, {
        url: url || DEFAULT_PFP,
        expires: Date.now() + PROFILE_CACHE_TTL
      });

      return url || DEFAULT_PFP;
    } catch {
      if (cached?.url) return cached.url;

      if (i === retries - 1) {
        profileCache.set(user, {
          url: DEFAULT_PFP,
          expires: Date.now() + PROFILE_CACHE_TTL
        });

        return DEFAULT_PFP;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return DEFAULT_PFP;
}

async function onParticipantsUpdate(sock, update) {
  const { id, participants = [], action } = update;

  if (!id || !participants.length) return;

  const enabled = await db.getGroupSetting(id, 'welcome');
  if (!enabled) return;

  let metadata;
  try {
    metadata = await sock.groupMetadata(id);
  } catch {
    return;
  }

  const groupName = metadata.subject || 'Grupo';
  const groupDesc = metadata.desc || 'Sin descripción';

  for (const user of participants) {
    const num = user.split('@')[0];
    const pfp = await getProfilePictureWithRetry(sock, user);

    if (action === 'add') {
      await sock.sendMessage(id, {
        image: { url: pfp },
        caption:
`╭─❖「 👋 BIENVENIDO 」
│
│ ✦ Hola @${num}
│ ✦ Bienvenido a *${groupName}*
│
│ 📝 ${groupDesc.slice(0, 120)}
│
╰──────────────`,
        mentions: [user]
      });
    }

    if (action === 'remove') {
      await sock.sendMessage(id, {
        image: { url: pfp },
        caption:
`╭─❖「 😢 DESPEDIDA 」
│
│ @${num} salió del grupo
│ Te extrañaremos...
│
│ Ojalá te atropelle un carro
│ pero con cariño 💔🚗
│
╰──────────────`,
        mentions: [user]
      });
    }
  }
}

module.exports = {
  init,
  onMessage,
  onParticipantsUpdate,
  getProfilePictureWithRetry,

  getState,
  isActive,
  getMultiplier
};
