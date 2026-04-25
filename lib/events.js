'use strict';

const db = require('./database');

const state = {
  active: null,
  messages: {},
};

const CFG = {
  minInterval: 10 * 60 * 1000,
  maxInterval: 20 * 60 * 1000,
  duration: 60 * 1000, // ⏳ 60 segundos
  activityThreshold: 25,
  updateInterval: 5000 // 🔁 cada 5s actualiza barra
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

// 📊 Barra de progreso
function progressBar(totalMs, endsAt, size = 12) {
  const remaining = Math.max(0, endsAt - now());
  const ratio = 1 - (remaining / totalMs);
  const filled = Math.round(ratio * size);

  const bar = '🟩'.repeat(filled) + '⬜'.repeat(size - filled);
  const secs = Math.ceil(remaining / 1000);

  return `⏳ ${secs}s\n${bar}`;
}

// 🚀 INIT
function init(sock) {
  scheduleNext(sock);
}

// ⏱️ siguiente evento
function scheduleNext(sock) {
  const delay = rand(CFG.minInterval, CFG.maxInterval);
  setTimeout(() => maybeStartEvent(sock), delay);
}

// 🎯 crear evento
async function maybeStartEvent(sock) {
  if (state.active) return scheduleNext(sock);

  const types = ['bonus', 'rob', 'double', 'trivia'];
  const type = pick(types);

  state.active = {
    type,
    groupId: null,
    endsAt: now() + CFG.duration,
    answer: null,
    multiplier: 1,
    winner: null,
    msgKey: null,
    intervalId: null
  };

  if (type === 'double') state.active.multiplier = 2;
  if (type === 'trivia') state.active.answer = String(rand(1, 10));

  setTimeout(() => finishEvent(sock), CFG.duration + 1000);
}

// 🧠 mensajes
async function onMessage(ctx) {
  const { sock, remoteJid, body, sender, pushName, fromGroup } = ctx;
const autoaudio = require('../plugins/audios');

await audios.onMessage({
  sock,
  remoteJid,
  body,
  sender,
  pushName,
  fromGroup
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

  // 💰 BONUS
  if (state.active.type === 'bonus' && text === 'yo' && !state.active.winner) {
    state.active.winner = sender;

    const gain = rand(25, 60);
    await db.addXP(sender, gain);

    await sock.sendMessage(remoteJid, {
      text: `🎉 ${pushName} ganó +${gain} XP`
    });

    return endEvent(sock);
  }

  // 😈 ROBO
  if (state.active.type === 'rob' && text.startsWith('robaxp') && !state.active.winner) {
    const bonus = rand(10, 30);
    await db.addXP(sender, bonus);

    await sock.sendMessage(remoteJid, {
      text: `😈 ${pushName} obtuvo +${bonus} XP`
    });

    return endEvent(sock);
  }

  // ⚡ DOBLE XP
  if (state.active.type === 'double') {
    await db.addXP(sender, 5 * state.active.multiplier);
  }

  // 🎯 TRIVIA
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

// 📣 anunciar + barra viva
async function announceEvent(sock, ev) {
  const jid = ev.groupId;
  if (!jid) return;

  const base = {
    bonus: '💰 Bonus! escribe *yo*',
    rob: '😈 Robo global! usa *robaxp*',
    double: '⚡ Doble XP activo',
    trivia: '🎯 Adivina el número (1-10)'
  }[ev.type];

  const text = `${base}\n\n${progressBar(CFG.duration, ev.endsAt)}`;

  const sent = await sock.sendMessage(jid, { text });
  ev.msgKey = sent.key;

  ev.intervalId = setInterval(async () => {
    if (!state.active || state.active !== ev) return;

    const newText = `${base}\n\n${progressBar(CFG.duration, ev.endsAt)}`;

    try {
      await sock.sendMessage(jid, {
        text: newText,
        edit: ev.msgKey // ✏️ intenta editar
      });
    } catch {
      // fallback sin edit
      await sock.sendMessage(jid, { text: newText });
    }

  }, CFG.updateInterval);
}

// 🧹 terminar evento
async function endEvent(sock) {
  if (state.active?.intervalId) {
    clearInterval(state.active.intervalId);
  }

  state.active = null;
  scheduleNext(sock);
}

// ⏹️ fin automático
async function finishEvent(sock) {
  if (!state.active) return;

  const { groupId, type, winner } = state.active;

  if (state.active.intervalId) {
    clearInterval(state.active.intervalId);
  }

  if (groupId && !winner) {
    await sock.sendMessage(groupId, {
      text: `⏱️ Tiempo terminado… nadie ganó 😶`
    });
  }

  state.active = null;
  scheduleNext(sock);
}

module.exports = {
  init,
  onMessage
};
