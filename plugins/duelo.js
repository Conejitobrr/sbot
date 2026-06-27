'use strict';

const db = require('../lib/database');

let events = null;
try {
  events = require('../lib/events');
} catch {}

const pendingDuels = new Map();
const cooldowns = new Map();

const ACCEPT_TIME = 60 * 1000;
const COOLDOWN = 5 * 60 * 1000;
const ATTACK_DELAY = 10 * 1000;

const attacks = [
  '🥊 lanzó una patada voladora',
  '🩴 tiró una chancla legendaria',
  '🗡️ usó un combo prohibido',
  '🍵 invocó el poder del emoliente',
  '🪑 atacó con una silla oxidada',
  '🥷 hizo un golpe ninja',
  '🍛 tiró arroz con pollo hirviendo',
  '🔥 activó modo barrio',
  '⚔️ sacó una espada imaginaria',
  '👁️ usó mirada intimidante',
  '🥖 lanzó un pan con palta',
  '💬 atacó con insulto crítico',
  '🕺 hizo un baile confuso',
  '🌌 sacó poderes de anime',
  '👵 invocó a su tía molesta',
  '📶 usó el WiFi del vecino como arma',
  '🪨 lanzó una piedra emocional',
  '🎒 pegó con una mochila llena',
  '💡 atacó con factura de luz',
  '🚌 hizo técnica secreta de combi'
];

const dodgeActions = [
  'se agachó justo a tiempo',
  'lo esquivó como Ultra Instinto',
  'saltó hacia atrás con estilo',
  'se escondió detrás de una tapa de olla',
  'lo evitó corriendo como de la Sunat',
  'se tiró al piso dramáticamente',
  'hizo una maniobra de mototaxi',
  'desapareció por puro lag',
  'bloqueó con una mochila',
  'se movió como NPC bugueado'
];

const crits = [
  '🔥 *GOLPE CRÍTICO*',
  '⚡ *ATAQUE LEGENDARIO*',
  '💀 *COMBO MORTAL*',
  '🌪️ *PODER DESCONTROLADO*',
  '☄️ *IMPACTO CELESTIAL*',
  '🩸 *DAÑO BRUTAL*'
];

const fatalities = [
  'fue atropellado por una mototaxi imaginaria',
  'quedó traumado por una mirada',
  'salió volando hasta otro distrito',
  'fue enviado al lobby',
  'perdió contra el poder del guion',
  'quedó fuera de servicio',
  'terminó pidiendo taxi a casa',
  'se rindió dramáticamente',
  'fue derrotado por el presupuesto',
  'quedó como NPC secundario'
];

const battleIntros = [
  '🌌 El cielo se oscureció y el grupo quedó en silencio...',
  '⚠️ Los admins sintieron una perturbación en el chat...',
  '🔥 Una energía rara empezó a rodear el grupo...',
  '🌪️ El suelo tembló como pelea final de anime...',
  '👀 El público empezó a mirar el duelo con miedo...',
  '🥁 La tensión subió como precio del pollo...'
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function mention(jid = '') {
  return '@' + jid.split('@')[0];
}

function getTarget(msg, args) {
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (mentioned) return mentioned;

  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quoted) return quoted;

  if (args[0]) {
    const clean = args[0].replace(/\D/g, '');
    if (clean) return clean + '@s.whatsapp.net';
  }

  return null;
}

function progressBar(hp) {
  const total = 10;
  const filled = Math.max(0, Math.round((hp / 100) * total));
  return '🟩'.repeat(filled) + '⬜'.repeat(total - filled);
}

async function safeEdit(sock, remoteJid, key, text, mentions = []) {
  try {
    await sock.sendMessage(remoteJid, {
      text,
      edit: key,
      mentions
    });
  } catch {
    await sock.sendMessage(remoteJid, {
      text,
      mentions
    });
  }
}

function hpBlock(p1, hp1, p2, hp2) {
  return `🥷 ${p1}
${progressBar(hp1)} *${hp1} HP*

🗡️ ${p2}
${progressBar(hp2)} *${hp2} HP*`;
}

async function finishDuel(sock, remoteJid, challenger, opponent, bet = 0) {
  let hp1 = 100;
  let hp2 = 100;

  const story = [];

  const p1 = mention(challenger);
  const p2 = mention(opponent);

  let turn = Math.random() < 0.5 ? challenger : opponent;

  const sent = await sock.sendMessage(remoteJid, {
    text:
`╔═══「 ⚔️ DUELO INICIADO 」═══╗

${pick(battleIntros)}

${hpBlock(p1, hp1, p2, hp2)}

🔥 Preparando el primer ataque...

╚══════════════════════╝`,
    mentions: [challenger, opponent]
  });

  for (let round = 1; round <= 8 && hp1 > 0 && hp2 > 0; round++) {
    await sleep(ATTACK_DELAY);

    const attacker = turn;
    const defender = attacker === challenger ? opponent : challenger;

    const attackerName = mention(attacker);
    const defenderName = mention(defender);

    const attackText = pick(attacks);
    const dodge = Math.random() < 0.18;

    let roundText =
`╔═══「 ⚔️ DUELO EN CURSO 」═══╗

🔁 *Ronda ${round}*

${attackerName} ${attackText}.`;

    if (dodge) {
      const dodgeText = pick(dodgeActions);

      roundText += `

🛡️ ${defenderName} ${dodgeText}.
✨ *No recibió daño.*`;

      story.push(`${attackerName} intentó atacar, pero ${defenderName} ${dodgeText}.`);

      turn = defender;
    } else {
      let damage = Math.floor(Math.random() * 26) + 15;
      const critical = Math.random() < 0.22;

      if (critical) {
        damage *= 2;

        roundText += `

${pick(crits)}`;
      }

      if (defender === challenger) hp1 -= damage;
      else hp2 -= damage;

      hp1 = Math.max(0, hp1);
      hp2 = Math.max(0, hp2);

      roundText += `

💥 El golpe impactó contra ${defenderName}.
🩸 ${defenderName} perdió *${damage} HP*.`;

      story.push(`${attackerName} ${attackText} y le quitó ${damage} HP a ${defenderName}.`);

      turn = defender;
    }

    roundText += `

━━━━━━━━━━━━━━

${hpBlock(p1, hp1, p2, hp2)}

╚══════════════════════╝`;

    await safeEdit(sock, remoteJid, sent.key, roundText, [challenger, opponent]);
  }

  const winner = hp1 > hp2 ? challenger : opponent;
  const loser = winner === challenger ? opponent : challenger;

  const winnerName = mention(winner);
  const loserName = mention(loser);

  let reward = Math.floor(Math.random() * 251) + 150;
  let lost = Math.floor(Math.random() * 101) + 50;

  let jackpotText = '';
  if (Math.random() < 0.03) {
    reward += 1000;
    jackpotText = '\n💎 *JACKPOT RARO:* el público lanzó XP extra al ganador.';
  }

  if (events?.isActive?.('double')) {
    reward *= events.getMultiplier?.() || 2;
  }

  if (bet > 0) {
    const loserData = await db.getUser(loser);
    const finalBet = Math.min(bet, loserData.xp || 0);

    if (finalBet > 0) {
      await db.removeXP(loser, finalBet);
      await db.addXP(winner, finalBet);
      reward += finalBet;
    }
  }

  await db.addXP(winner, reward);
  await db.removeXP(loser, lost);

  await sleep(5000);

  await safeEdit(
    sock,
    remoteJid,
    sent.key,
`╔═══「 🏁 DUELO TERMINADO 」═══╗

${hpBlock(p1, hp1, p2, hp2)}

🏆 *Ganador:* ${winnerName}

╚══════════════════════╝`,
    [challenger, opponent]
  );

  const resumen =
    story.length > 0
      ? story.slice(0, 6).join('\n')
      : 'La pelea fue tan rápida que nadie entendió qué pasó.';

  const finalText =
`╔═══「 📜 RESUMEN DEL DUELO 」═══╗

${resumen}

━━━━━━━━━━━━━━

💀 ${loserName} ${pick(fatalities)}.

🏆 *GANADOR:* ${winnerName}

⭐ Recompensa: *+${reward} XP*
💸 Perdedor: *-${lost} XP*
${bet > 0 ? `🎰 Apuesta inicial: *${bet} XP*` : ''}${jackpotText}

╚══════════════════════╝`;

  await sock.sendMessage(remoteJid, {
    text: finalText,
    mentions: [challenger, opponent]
  });
}

module.exports = {
  commands: ['duelo', 'confirm', 'nodeseo'],

  async execute(ctx) {
    const {
      sock,
      msg,
      remoteJid,
      sender,
      args,
      command,
      fromGroup,
      isOwner
    } = ctx;

    if (!fromGroup) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Este comando solo funciona en grupos.'
      }, { quoted: msg });
    }

    if (command === 'nodeseo') {
      const duel = pendingDuels.get(remoteJid);

      if (!duel || duel.opponent !== sender) {
        return sock.sendMessage(remoteJid, {
          text: '⚠️ No tienes ningún duelo pendiente.'
        }, { quoted: msg });
      }

      clearTimeout(duel.timer);
      pendingDuels.delete(remoteJid);

      return sock.sendMessage(remoteJid, {
        text: `❌ ${mention(sender)} rechazó el duelo.`,
        mentions: [sender]
      }, { quoted: msg });
    }

    if (command === 'confirm') {
      const duel = pendingDuels.get(remoteJid);

      if (!duel || duel.opponent !== sender) {
        return sock.sendMessage(remoteJid, {
          text: '⚠️ No tienes ningún duelo pendiente.'
        }, { quoted: msg });
      }

      clearTimeout(duel.timer);
      pendingDuels.delete(remoteJid);

      const challengerData = await db.getUser(duel.challenger);
      const opponentData = await db.getUser(duel.opponent);

      if (duel.bet > 0) {
        if ((challengerData.xp || 0) < duel.bet || (opponentData.xp || 0) < duel.bet) {
          return sock.sendMessage(remoteJid, {
            text: '❌ Uno de los jugadores ya no tiene suficiente XP para la apuesta.'
          }, { quoted: msg });
        }
      }

      await sock.sendMessage(remoteJid, {
        text:
`⚔️ *DUELO ACEPTADO*

🥷 ${mention(duel.challenger)}
VS
🗡️ ${mention(duel.opponent)}

🔥 Que empiece la batalla...`,
        mentions: [duel.challenger, duel.opponent]
      }, { quoted: msg });

      return finishDuel(sock, remoteJid, duel.challenger, duel.opponent, duel.bet);
    }

    const now = Date.now();
    const last = cooldowns.get(sender) || 0;
    const remaining = COOLDOWN - (now - last);

    if (!isOwner && remaining > 0) {
      const min = Math.ceil(remaining / 60000);

      return sock.sendMessage(remoteJid, {
        text: `⏳ Espera *${min} minuto(s)* para volver a retar a duelo.`
      }, { quoted: msg });
    }

    if (pendingDuels.has(remoteJid)) {
      return sock.sendMessage(remoteJid, {
        text: '⚠️ Ya hay un duelo pendiente en este grupo.'
      }, { quoted: msg });
    }

    const target = getTarget(msg, args);

    if (!target) {
      return sock.sendMessage(remoteJid, {
        text:
`⚔️ *Uso:*
.duelo @usuario
.duelo @usuario 500

El rival debe responder:
.confirm
.nodeseo`
      }, { quoted: msg });
    }

    if (target === sender) {
      return sock.sendMessage(remoteJid, {
        text: '❌ No puedes retarte a ti mismo.'
      }, { quoted: msg });
    }

    const bet = Math.max(0, Number(args.find(a => /^\d+$/.test(a)) || 0));

    if (bet > 0) {
      const challengerData = await db.getUser(sender);
      const targetData = await db.getUser(target);

      if ((challengerData.xp || 0) < bet) {
        return sock.sendMessage(remoteJid, {
          text: '❌ No tienes suficiente XP para esa apuesta.'
        }, { quoted: msg });
      }

      if ((targetData.xp || 0) < bet) {
        return sock.sendMessage(remoteJid, {
          text: '❌ El rival no tiene suficiente XP para esa apuesta.'
        }, { quoted: msg });
      }
    }

    const timer = setTimeout(async () => {
      const duel = pendingDuels.get(remoteJid);
      if (!duel) return;

      pendingDuels.delete(remoteJid);

      await sock.sendMessage(remoteJid, {
        text:
`⏰ *Duelo cancelado*

${mention(target)} no aceptó a tiempo.`,
        mentions: [target]
      });
    }, ACCEPT_TIME);

    pendingDuels.set(remoteJid, {
      challenger: sender,
      opponent: target,
      bet,
      timer
    });

    cooldowns.set(sender, now);

    await sock.sendMessage(remoteJid, {
      text:
`╔═══「 ⚔️ DUELO PROPUESTO 」═══╗

🥷 Retador: ${mention(sender)}
🗡️ Rival: ${mention(target)}
${bet > 0 ? `🎰 Apuesta: *${bet} XP*` : '🎰 Apuesta: *sin apuesta*'}

⏳ ${mention(target)}, tienes *60 segundos* para responder:

✅ *.confirm*
❌ *.nodeseo*

╚══════════════════════╝`,
      mentions: [sender, target]
    }, { quoted: msg });
  }
};
