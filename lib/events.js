'use strict';

const db = require('./database');
const path = require('path');

const state = {
  active: null,
  messages: {},
};

// ═══════════════════════════════════════
// CACHE FOTO PERFIL
// ═══════════════════════════════════════
const profileCache = new Map();
const PROFILE_CACHE_TTL = 1000 * 60 * 30; // 30 min
const DEFAULT_PFP = path.resolve(process.cwd(), 'assets/Sinperfil.jpg');

const CFG = {
  minInterval: 10 * 60 * 1000,
  maxInterval: 20 * 60 * 1000,
  duration: 60 * 1000,
  activityThreshold: 25
};

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function now() {
  return Date.now();
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function init(sock) {
  scheduleNext(sock);
}

function scheduleNext(sock) {
  const delay = rand(CFG.minInterval, CFG.maxInterval);
  setTimeout(() => maybeStartEvent(sock), delay);
}

async function maybeStartEvent(sock) {
  if (state.active) return scheduleNext(sock);

  const types = ['bonus', 'rob', 'trivia'];
  const type = pick(types);

  state.active = {
    type,
    groupId: null,
    endsAt: now() + CFG.duration,
    answer: null,
    winner: null
  };

  if (type === 'trivia') state.active.answer = String(rand(1, 10));

  setTimeout(() => finishEvent(sock), CFG.duration + 1000);
}

async function onMessage(ctx) {
  const { sock, remoteJid, body, sender, pushName, fromGroup } = ctx;
  const audios = require('../plugins/audios');

  await audios.onMessage({
  sock,
  remoteJid,
  body,
  sender,
  pushName,
  fromGroup,
  msg
});

  if (!fromGroup) return;

  state.messages[remoteJid] = (state.messages[remoteJid] || 0) + 1;

  if (!state.active && state.messages[remoteJid] >= CFG.activityThreshold) {
    state.messages[remoteJid] = 0;
    await maybeStartEvent(sock);
  }

  if (state.active && !state.active.groupId) {
    state.active.groupId = remoteJid;
    await announceEvent(sock, state.active);
  }

  if (!state.active || state.active.groupId !== remoteJid) return;
  if (now() > state.active.endsAt) return;

  const text = (body || '').toLowerCase().trim();

  if (state.active.type === 'bonus' && text === 'yo' && !state.active.winner) {
    state.active.winner = sender;

    const gain = rand(25, 60);
    await db.addXP(sender, gain);

    await sock.sendMessage(remoteJid, {
      text: `🎉 ${pushName} ganó +${gain} XP`
    });

    return endEvent(sock);
  }

  if (state.active.type === 'rob' && text.startsWith('robaxp') && !state.active.winner) {
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
      text: `🏆 ${pushName} acertó! +${gain} XP`
    });

    return endEvent(sock);
  }
}

async function announceEvent(sock, ev) {
  const jid = ev.groupId;
  if (!jid) return;

  const seconds = Math.floor(CFG.duration / 1000);

  const base = {
    bonus: `💰 Bonus! escribe *yo*\n⏳ Tienes ${seconds}s`,
    rob: `😈 Robo global! usa *robaxp*\n⏳ Tienes ${seconds}s`,
    trivia: `🎯 Adivina el número (1-10)\n⏳ Tienes ${seconds}s`
  }[ev.type];

  await sock.sendMessage(jid, { text: base });
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
      text: `⏱️ Tiempo terminado… nadie ganó 😶`
    });
  }

  state.active = null;
  scheduleNext(sock);
}

// ═══════════════════════════════════════
// FOTO PERFIL CON CACHE + FALLBACK LOCAL
// ═══════════════════════════════════════
async function getProfilePictureWithRetry(sock, user, retries = 3) {
  const cached = profileCache.get(user);

  if (cached && cached.expires > Date.now()) {
    return cached.url;
  }

  for (let i = 0; i < retries; i++) {
    try {
      const url = await sock.profilePictureUrl(user, 'image');

      if (!url) {
        profileCache.set(user, {
          url: DEFAULT_PFP,
          expires: Date.now() + PROFILE_CACHE_TTL
        });
        return DEFAULT_PFP;
      }

      profileCache.set(user, {
        url,
        expires: Date.now() + PROFILE_CACHE_TTL
      });

      return url;

    } catch (err) {
      const status = err?.output?.statusCode || err?.response?.status;

      if (status === 429) {
        if (cached?.url) return cached.url;
        return DEFAULT_PFP;
      }

      if (i === retries - 1) {
        profileCache.set(user, {
          url: DEFAULT_PFP,
          expires: Date.now() + PROFILE_CACHE_TTL
        });

        return DEFAULT_PFP;
      }

      await new Promise(r => setTimeout(r, 1000));
    }
  }

  return DEFAULT_PFP;
}

// ═══════════════════════════════════════
// WELCOME / GOODBYE SYSTEM
// ═══════════════════════════════════════
async function onParticipantsUpdate(sock, update) {
  const { id, participants, action } = update;

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
  onParticipantsUpdate
};
