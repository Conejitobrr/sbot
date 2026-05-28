'use strict';

const fs = require('fs');
const path = require('path');
const db = require('../lib/database');

const ROBOS_PATH = path.join(process.cwd(), 'lib', 'robos_recientes.json');

function ensureRobosDB() {
  const dir = path.dirname(ROBOS_PATH);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(ROBOS_PATH)) {
    fs.writeFileSync(ROBOS_PATH, JSON.stringify({}, null, 2));
  }
}

function loadRobos() {
  ensureRobosDB();

  try {
    return JSON.parse(fs.readFileSync(ROBOS_PATH, 'utf8') || '{}');
  } catch {
    return {};
  }
}

function saveRobos(data) {
  ensureRobosDB();
  fs.writeFileSync(ROBOS_PATH, JSON.stringify(data, null, 2));
}

function cleanJid(jid = '') {
  return String(jid).split(':')[0];
}

function saveRecentRobbery(remoteJid, thief, victim, amount) {
  const data = loadRobos();

  if (!data[remoteJid]) {
    data[remoteJid] = [];
  }

  const now = Date.now();

  data[remoteJid] = data[remoteJid]
    .filter(r => now - Number(r.time || 0) <= 10 * 60 * 1000);

  data[remoteJid].push({
    thief: cleanJid(thief),
    victim: cleanJid(victim),
    amount,
    time: now,
    caught: false
  });

  saveRobos(data);
}

module.exports = {
  commands: ['robar'],
  description: 'Roba experiencia a otro usuario',

  async execute(ctx) {
    const {
      sock,
      remoteJid,
      sender,
      msg,
      fromGroup
    } = ctx;

    if (!fromGroup) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Este comando solo funciona en grupos.'
      }, { quoted: msg });
    }

    let target;

    if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
      target = msg.message.extendedTextMessage.contextInfo.participant;
    } else if (
      msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length
    ) {
      target = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
    }

    target = cleanJid(target);
    const thief = cleanJid(sender);

    if (!target) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Debes mencionar o responder a alguien.'
      }, { quoted: msg });
    }

    if (target === thief) {
      return sock.sendMessage(remoteJid, {
        text: '❌ No puedes robarte a ti mismo.'
      }, { quoted: msg });
    }

    const robber = await db.getUser(thief);
    const victim = await db.getUser(target);

    const now = Date.now();
    const cooldown = 10 * 60 * 1000;

    const remaining = cooldown - (now - (robber.lastRobXp || 0));

    if (remaining > 0) {
      const m = Math.floor(remaining / 60000);

      return sock.sendMessage(remoteJid, {
        text:
`⏳ Debes esperar ${m} minuto(s)
antes de volver a robar XP.`
      }, { quoted: msg });
    }

    if ((victim.xp || 0) < 200) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Esa persona no tiene suficiente XP para robar.'
      }, { quoted: msg });
    }

    let amount = Math.floor(Math.random() * 151) + 50;
    let jackpot = false;

    if (Math.random() < 0.05) {
      amount = 1000;
      jackpot = true;
    }

    amount = Math.min(amount, victim.xp);

    await db.removeXP(target, amount);
    await db.addXP(thief, amount);

    await db.setUser(thief, {
      lastRobXp: now
    });

    saveRecentRobbery(remoteJid, thief, target, amount);

    const number = target.split('@')[0];

    await sock.sendMessage(remoteJid, {
      text:
jackpot
? `💎 JACKPOT!\n\nRobaste ${amount} XP a @${number}\n\n🚨 La policía puede atraparte si usan *.policia* en los próximos 5 minutos.`
: `🦹 Robaste ${amount} XP a @${number}\n\n🚨 La policía puede atraparte si usan *.policia* en los próximos 5 minutos.`,
      mentions: [target]
    }, { quoted: msg });
  }
};
