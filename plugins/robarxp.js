'use strict';

const fs = require('fs');
const path = require('path');
const db = require('../lib/database');
const shop = require('../lib/shop');

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

    // 1️⃣ PRIMERO: Comprobamos si el ladrón está en tiempo de espera (Cooldown)
    const cooldown = 10 * 60 * 1000;
    const remaining = cooldown - (now - (robber.lastRobXp || 0));

    if (remaining > 0) {
      const m = Math.floor(remaining / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      return sock.sendMessage(remoteJid, {
        text: `⏳ Debes esperar ${m} min y ${s} seg\nantes de volver a intentar robar XP.`
      }, { quoted: msg });
    }

    // 2️⃣ SEGUNDO: Comprobamos si la víctima tiene dinero (No gastar escudo si no vale la pena)
    if ((victim.xp || 0) < 2000) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Esa persona es demasiado pobre para ser asaltada (Mínimo 2000 XP).'
      }, { quoted: msg });
    }

    // 3️⃣ TERCERO: Lógica del Escudo Anti-Robo
    const victimInv = await shop.getInventory(target);
    if ((victimInv.shieldUses || 0) > 0) {
        await shop.useItem(target, 'shieldUses', 1);
        
        // Aplicamos el cooldown al ladrón usando sus datos completos para no borrar nada
        robber.lastRobXp = now;
        await db.setUser(thief, robber);

        return sock.sendMessage(remoteJid, {
            text: `🛡️ @${target.split('@')[0]} tiene un *Escudo Anti-Robo* activo. ¡El escudo absorbió el ataque y se rompió!\n\n_Pierdes tu turno y debes esperar el tiempo de penalización._`,
            mentions: [target]
        }, { quoted: msg });
    }

    // 4️⃣ CUARTO: Si pasa todo lo anterior, se realiza el robo
    let amount = 0;
    let jackpot = false;

    if (Math.random() < 0.05) {
      let porcentaje = (Math.random() * 0.08) + 0.12;
      amount = Math.floor(victim.xp * porcentaje);
      jackpot = true;
    } else {
      let porcentaje = (Math.random() * 0.05) + 0.03;
      amount = Math.floor(victim.xp * porcentaje);
    }

    amount = Math.min(amount, victim.xp);

    await db.removeXP(target, amount);
    await db.addXP(thief, amount);

    robber.lastRobXp = now;
    await db.setUser(thief, robber);

    saveRecentRobbery(remoteJid, thief, target, amount);

    const number = target.split('@')[0];

    await sock.sendMessage(remoteJid, {
      text: jackpot
        ? `💎 ¡JACKPOT MAFIOSO!\n\nDiste un gran golpe y le robaste *${amount} XP* a @${number} (una buena parte de su fortuna).\n\n🚨 La policía puede atraparte si usan *.policia* en los próximos 5 minutos.`
        : `🦹 Te metiste en los bolsillos de @${number} y le robaste *${amount} XP*\n\n🚨 La policía puede atraparte si usan *.policia* en los próximos 5 minutos.`,
      mentions: [target]
    }, { quoted: msg });
  }
};
