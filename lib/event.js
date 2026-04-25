'use strict';

const db = require('./database');

const state = {
  active: null, // { type, groupId, endsAt, ... }
  lastTrigger: 0,
  messages: {}, // conteo por grupo para activar por actividad
};

// Config fino (puedes moverlo a config.js si quieres)
const CFG = {
  minInterval: 10 * 60 * 1000, // 10 min entre eventos
  maxInterval: 20 * 60 * 1000, // 20 min
  duration: 20 * 1000,         // duración base de eventos (20s)
  activityThreshold: 25        // mensajes para disparar por actividad
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

// ─────────────────────────────────────────
// 🚀 INIT (llámalo desde main cuando conecte)
// ─────────────────────────────────────────
function init(sock) {
  scheduleNext(sock);
}

// Programa siguiente evento automático
function scheduleNext(sock) {
  const delay = rand(CFG.minInterval, CFG.maxInterval);
  setTimeout(() => maybeStartEvent(sock), delay);
}

// Decide si lanzar evento (simple y efectivo)
async function maybeStartEvent(sock) {
  if (state.active) {
    return scheduleNext(sock);
  }

  const types = ['bonus', 'rob', 'double', 'trivia'];
  const type = pick(types);

  // Puedes escoger grupos activos desde tu store si quieres
  // Aquí lo dejamos simple: necesitarás pasar el groupId desde onMessage
  // así que el primer grupo activo será el target.
  // Guardamos temporalmente y esperamos al primer onMessage para conocer groupId.
  state.active = {
    type,
    groupId: null,
    endsAt: now() + CFG.duration,
    // extras
    answer: null,
    multiplier: 1,
    winner: null
  };

  // Configurar cada tipo
  if (type === 'double') {
    state.active.multiplier = 2;
  }

  if (type === 'trivia') {
    const n = rand(1, 10);
    state.active.answer = String(n);
  }

  // El mensaje se enviará cuando tengamos groupId en onMessage
  state.lastTrigger = now();

  // Auto-cierre
  setTimeout(() => finishEvent(sock), CFG.duration + 1000);
}

// ─────────────────────────────────────────
// 🧠 HOOK EN CADA MENSAJE
// ─────────────────────────────────────────
async function onMessage(ctx) {
  const { sock, remoteJid, body, sender, pushName, fromGroup } = ctx;
  if (!fromGroup) return;

  // Conteo de actividad por grupo
  state.messages[remoteJid] = (state.messages[remoteJid] || 0) + 1;

  // Disparo por actividad
  if (!state.active && state.messages[remoteJid] >= CFG.activityThreshold) {
    state.messages[remoteJid] = 0;
    await maybeStartEvent(sock);
  }

  // Si hay evento activo y aún no tiene grupo, fijarlo y anunciar
  if (state.active && !state.active.groupId) {
    state.active.groupId = remoteJid;
    await announceEvent(sock, state.active);
  }

  // Si no es el grupo del evento, ignorar
  if (!state.active || state.active.groupId !== remoteJid) return;

  // Si ya terminó por tiempo
  if (now() > state.active.endsAt) return;

  const text = (body || '').toLowerCase().trim();

  // ────────────── TIPOS ──────────────

  // 💰 BONUS: primero que diga "yo"
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

  // 😈 ROBO GLOBAL: ventana libre sin cooldown
  if (state.active.type === 'rob' && text.startsWith('robaxp') && !state.active.winner) {
    // Uso directo de tu lógica existente vía DB
    // robo simple: quita a alguien aleatorio del grupo
    // (si tienes comando robaxp, aquí solo damos bonus por usarlo en ventana)
    const bonus = rand(10, 30);
    await db.addXP(sender, bonus);

    await sock.sendMessage(remoteJid, {
      text: `😈 Robo en caos! ${pushName} obtiene +${bonus} XP extra`
    });

    state.active.winner = sender;
    state.active = null;
    return scheduleNext(sock);
  }

  // ⚡ DOBLE XP: cualquier mensaje otorga bonus (solo una vez por usuario)
  if (state.active.type === 'double') {
    // dar un pequeño extra por participación durante el evento
    const extra = 5 * state.active.multiplier;
    await db.addXP(sender, extra);
    // no cerramos el evento, dura hasta el tiempo
  }

  // 🎯 TRIVIA: acertar número
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

// ─────────────────────────────────────────
// 📣 ANUNCIOS
// ─────────────────────────────────────────
async function announceEvent(sock, ev) {
  const jid = ev.groupId;
  if (!jid) return;

  if (ev.type === 'bonus') {
    return sock.sendMessage(jid, {
      text: '💰 Bonus activo! escribe *yo* para ganarlo (20s)'
    });
  }

  if (ev.type === 'rob') {
    return sock.sendMessage(jid, {
      text: '😈 Robo global! usa *robaxp* ahora (20s)'
    });
  }

  if (ev.type === 'double') {
    return sock.sendMessage(jid, {
      text: '⚡ Doble XP activo por 20s! participa y suma más'
    });
  }

  if (ev.type === 'trivia') {
    return sock.sendMessage(jid, {
      text: '🎯 Adivina el número del 1 al 10 (20s)'
    });
  }
}

// ─────────────────────────────────────────
// ⏹️ FIN
// ─────────────────────────────────────────
async function finishEvent(sock) {
  if (!state.active) return;

  const { groupId, type, winner } = state.active;

  if (groupId && !winner) {
    await sock.sendMessage(groupId, {
      text: `⏱️ Evento ${type} terminado… nadie ganó 😶`
    });
  }

  state.active = null;
  scheduleNext(sock);
}

module.exports = {
  init,
  onMessage
};
