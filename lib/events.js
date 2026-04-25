'use strict';

const db = require('./database');

const state = {
  active: null,
  lastTrigger: 0,
  messages: {},
};

// ⚙️ CONFIG
const CFG = {
  minInterval: 10 * 60 * 1000, // 10 min
  maxInterval: 20 * 60 * 1000, // 20 min
  duration: 60 * 1000,         // 🔥 60 segundos
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

// 🚀 INIT
function init(sock) {
  scheduleNext(sock);
}

// ⏱️ Programar siguiente evento
function scheduleNext(sock) {
  const delay = rand(CFG.minInterval, CFG.maxInterval);
  setTimeout(() => maybeStartEvent(sock), delay);
}

// 🎯 Crear evento
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
    winner: null
  };

  if (type === 'double') {
    state.active.multiplier = 2;
  }

  if (type === 'trivia') {
    state.active.answer = String(rand(1, 10));
  }

  state.lastTrigger = now();

  setTimeout(() => finishEvent(sock), CFG.duration + 1000);
}

// 🧠 Escuchar mensajes
async function onMessage(ctx) {
  const { sock, remoteJid, body, sender, pushName, fromGroup } = ctx;
  if (!fromGroup) return;

  state.messages[remoteJid] = (state.messages[remoteJid] || 0) + 1;

  // 🔥 Activación por actividad
  if (!state.active && state.messages[remoteJid] >= CFG.activityThreshold) {
    state.messages[remoteJid] = 0;
    await maybeStartEvent(sock);
  }

  // 📣 Asignar grupo y anunciar
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

    state.active = null;
    return scheduleNext(sock);
  }

  // 😈 ROBO GLOBAL
  if (state.active.type === 'rob' && text.startsWith('robaxp') && !state.active.winner) {
    const bonus = rand(10, 30);
    await db.addXP(sender, bonus);

    await sock.sendMessage(remoteJid, {
      text: `😈 Robo en caos! ${pushName} obtiene +${bonus} XP extra`
    });

    state.active.winner = sender;
    state.active = null;
    return scheduleNext(sock);
  }

  // ⚡ DOBLE XP
  if (state.active.type === 'double') {
    const extra = 5 * state.active.multiplier;
    await db.addXP(sender, extra);
  }

  // 🎯 TRIVIA
  if (state.active.type === 'trivia' && text === state.active.answer && !state.active.winner) {
    state.active.winner = sender;

    const gain = rand(40, 80);
    await db.addXP(sender, gain);

    await sock.sendMessage(remoteJid, {
      text: `🏆 ${pushName} acertó! +${gain} XP`
    });

    state.active = null;
    return scheduleNext(sock);
  }
}

// 📣 ANUNCIAR EVENTO
async function announceEvent(sock, ev) {
  const jid = ev.groupId;
  if (!jid) return;

  const seconds = Math.floor((ev.endsAt - Date.now()) / 1000);

  if (ev.type === 'bonus') {
    return sock.sendMessage(jid, {
      text: `💰 Bonus activo! escribe *yo* para ganarlo (${seconds}s)`
    });
  }

  if (ev.type === 'rob') {
    return sock.sendMessage(jid, {
      text: `😈 Robo global! usa *robaxp* ahora (${seconds}s)`
    });
  }

  if (ev.type === 'double') {
    return sock.sendMessage(jid, {
      text: `⚡ Doble XP activo por ${seconds}s! participa y suma más`
    });
  }

  if (ev.type === 'trivia') {
    return sock.sendMessage(jid, {
      text: `🎯 Adivina el número del 1 al 10 (${seconds}s)`
    });
  }
}

// ⏹️ FIN EVENTO
async function finishEvent(sock) {
  if (!state.active) return;

  const { groupId, type, winner } = state.active;

  if (groupId && !winner) {
    await sock.sendMessage(groupId, {
      text: `⏱️ Tiempo terminado (${CFG.duration / 1000}s)… nadie ganó 😶`
    });
  }

  state.active = null;
  scheduleNext(sock);
}

module.exports = {
  init,
  onMessage
};
