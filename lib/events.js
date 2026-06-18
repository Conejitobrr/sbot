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
  minInterval: 30 * 60 * 1000, 
  maxInterval: 60 * 60 * 1000, 
  duration: 60 * 1000,         
  activityThreshold: 100       
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

function getDefaultPfpBuffer() {
  try {
    if (fs.existsSync(DEFAULT_PFP)) {
      return fs.readFileSync(DEFAULT_PFP);
    }
  } catch {}

  return null;
}

function init(sock) {
  if (!sock) return;

  state.initialized = true;

  sock.ev.on('group-participants.update', async update => {

    console.log('👥 group-participants.update:', update);

    try {
      await onParticipantsUpdate(sock, update);
    } catch (e) {
      console.log('❌ Error en welcome/goodbye:', e?.message || e);
    }
  });

  console.log('✅ Sistema welcome/goodbye iniciado');

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

  // 🔥 SHADOWBAN: SI ESTÁ BANEADO, EL EVENTO LO IGNORA POR COMPLETO
  const isBanned = await db.isBanned(sender);
  if (isBanned) return;

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

    const gain = rand(1500, 3000); 
    await db.addXP(sender, gain);

    await sock.sendMessage(remoteJid, {
      text: `🎉 ¡Qué velocidad! ${pushName} ganó *+${gain} XP*`
    });

    return endEvent(sock);
  }

  if (state.active.type === 'rob' && text === 'robaxp' && !state.active.winner) {
    state.active.winner = sender;

    const bonus = rand(1000, 2500); 
    await db.addXP(sender, bonus);

    await sock.sendMessage(remoteJid, {
      text: `😈 Misión cumplida. ${pushName} se robó el botín de *+${bonus} XP*`
    });

    return endEvent(sock);
  }

  if (state.active.type === 'trivia' && text === state.active.answer && !state.active.winner) {
    state.active.winner = sender;

    const gain = rand(2000, 4000); 
    await db.addXP(sender, gain);

    await sock.sendMessage(remoteJid, {
      text: `🏆 ¡Correcto! ${pushName} acertó y se lleva *+${gain} XP*`
    });

    return endEvent(sock);
  }

  if (state.active.type === 'double' && text === 'doble' && !state.active.winner) {
    state.active.winner = sender;

    await sock.sendMessage(remoteJid, {
      text: `⚡ ${pushName} ha reclamado la energía. ¡Todos ganan *doble XP* durante este evento!`
    });

    return endEvent(sock);
  }
}

async function announceEvent(sock, ev) {
  if (!ev?.groupId) return;

  const seconds = Math.floor(CFG.duration / 1000);

  const text = {
    bonus: `💰 *EVENTO BONUS* 💰\n\nEl primero en escribir *yo* se lleva la caja fuerte.\n⏳ Tienes ${seconds}s`,
    rob: `😈 *ROBO GLOBAL* 😈\n\nEl primero en escribir *robaxp* se roba el botín.\n⏳ Tienes ${seconds}s`,
    trivia: `🎯 *TRIVIA EXPRESS* 🎯\n\nEstoy pensando en un número del *1 al 10*. ¡El primero en adivinar gana!\n⏳ Tienes ${seconds}s`,
    double: `⚡ *DOBLE XP* ⚡\n\nEl primero en escribir *doble* activa doble XP para todos temporalmente.\n⏳ Tienes ${seconds}s`
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
      text: '⏱️ El tiempo se acabó y nadie fue lo suficientemente rápido. El evento desapareció en las sombras 😶'
    });
  }

  state.active = null;
  scheduleNext(sock);
}

async function getProfilePictureWithRetry(sock, user, retries = 2) {
  const cached = profileCache.get(user);

  if (cached && cached.expires > Date.now()) {
    return cached;
  }

  for (let i = 0; i < retries; i++) {
    try {
      const url = await sock.profilePictureUrl(user, 'image');
      const res = await fetch(url);
      const buffer = Buffer.from(await res.arrayBuffer());

      const data = {
        buffer,
        expires: Date.now() + PROFILE_CACHE_TTL
      };

      profileCache.set(user, data);
      return data;
    } catch {
      if (cached?.buffer) return cached;

      if (i === retries - 1) {
        const data = {
          buffer: getDefaultPfpBuffer(),
          expires: Date.now() + PROFILE_CACHE_TTL
        };

        profileCache.set(user, data);
        return data;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return {
    buffer: getDefaultPfpBuffer(),
    expires: Date.now() + PROFILE_CACHE_TTL
  };
}

async function sendWelcome(sock, groupId, caption, mentions, photoData) {
  try {
    if (photoData?.buffer) {
      return await sock.sendMessage(groupId, {
        image: photoData.buffer,
        caption,
        mentions
      });
    }

    return await sock.sendMessage(groupId, {
      text: caption,
      mentions
    });
  } catch (e) {
    console.log('⚠️ Error enviando welcome:', e?.message || e);

    await sock.sendMessage(groupId, {
      text: caption,
      mentions
    });
  }
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
    const photoData = await getProfilePictureWithRetry(sock, user);

    if (action === 'add') {
      const caption =
`╭─❖「 👋 BIENVENIDO 」
│
│ ✦ Hola @${num}
│ ✦ Bienvenido a *${groupName}*
│
│ 📝 ${groupDesc.slice(0, 120)}
│
╰──────────────`;

      await sendWelcome(sock, id, caption, [user], photoData);
    }

    if (action === 'remove') {
      const caption =
`╭─❖「 😢 DESPEDIDA 」
│
│ @${num} salió del grupo
│ Te extrañaremos...
│
│ Ojalá te atropelle un carro
│ pero con cariño 💔🚗
│
╰──────────────`;

      await sendWelcome(sock, id, caption, [user], photoData);
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
