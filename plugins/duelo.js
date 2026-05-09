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
  'lanzó una patada voladora',
  'tiró una chancla legendaria',
  'usó un combo prohibido',
  'invocó el poder del emoliente',
  'atacó con una silla oxidada',
  'hizo un golpe ninja',
  'tiró arroz con pollo hirviendo',
  'activó modo barrio',
  'sacó una espada imaginaria',
  'usó mirada intimidante',
  'lanzó un pan con palta',
  'atacó con insulto crítico',
  'hizo un baile confuso',
  'sacó poderes de anime',
  'invocó a su tía molesta',
  'usó el WiFi del vecino como arma',
  'lanzó una piedra emocional',
  'pegó con una mochila llena',
  'atacó con factura de luz',
  'hizo técnica secreta de combi',
  'sacó el modo tóxico nivel dios',
  'lanzó una mirada de villano final',
  'atacó con una deuda emocional',
  'usó el poder del ají extra',
  'hizo un sprint como cobrador de combi',
  'lanzó una gaseosa caliente',
  'pegó con una almohada espiritual',
  'usó el poder prohibido del ceviche',
  'invocó a un mototaxista ancestral',
  'sacó una escoba encantada'
];

const crits = [
  '🔥 GOLPE CRÍTICO',
  '⚡ ATAQUE LEGENDARIO',
  '💀 COMBO MORTAL',
  '🌪️ PODER DESCONTROLADO',
  '☄️ IMPACTO CELESTIAL',
  '🩸 DAÑO BRUTAL',
  '👑 ATAQUE DE JEFE FINAL',
  '🚨 CRÍTICO ILEGAL'
];

const dodges = [
  'esquivó como si tuviera Ultra Instinto',
  'se agachó justo a tiempo',
  'corrió como de la Sunat',
  'desapareció misteriosamente',
  'se salvó por pura suerte',
  'bloqueó con una tapa de olla',
  'usó una mochila como escudo',
  'se escondió detrás de un NPC',
  'hizo lag y evitó el golpe',
  'se tiró al piso dramáticamente',
  'activó modo fantasma',
  'hizo una maniobra de mototaxi'
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
  'terminó bloqueando al rival por miedo',
  'se fue a dormir con derrota incluida',
  'quedó como NPC secundario'
];

const battleIntros = [
  'El cielo se oscureció y el grupo quedó en silencio...',
  'Los admins sintieron una perturbación en el chat...',
  'Una energía rara empezó a rodear el grupo...',
  'El suelo tembló como si fuera pelea final de anime...',
  'El público empezó a apostar stickers imaginarios...',
  'La tensión subió más que el precio del pollo...'
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
  return '█'.repeat(filled) + '░'.repeat(total - filled);
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

async function finishDuel(sock, remoteJid, challenger, opponent, bet = 0) {
  let hp1 = 100;
  let hp2 = 100;

  const log = [];
  const shortStory = [];

  const p1 = mention(challenger);
  const p2 = mention(opponent);

  let turn = Math.random() < 0.5 ? challenger : opponent;

  const sent = await sock.sendMessage(remoteJid, {
    text:
`⚔️ *DUELO INICIADO* ⚔️

${pick(battleIntros)}

🥷 ${p1}
${progressBar(hp1)} *${hp1} HP*

🗡️ ${p2}
${progressBar(hp2)} *${hp2} HP*

🔥 Preparando el primer ataque...`,
    mentions: [challenger, opponent]
  });

  for (let round = 1; round <= 8 && hp1 > 0 && hp2 > 0; round++) {
    await sleep(ATTACK_DELAY);

    const attacker = turn;
    const defender = attacker === challenger ? opponent : challenger;

    const attackerName = mention(attacker);
    const defenderName = mention(defender);

    let roundText =
`⚔️ *DUELO EN CURSO* ⚔️

🔁 Ronda: *${round}*

`;

    const dodge = Math.random() < 0.18;

    if (dodge) {
      const line = `🛡️ ${defenderName} ${pick(dodges)}.`;

      log.push(line);
      shortStory.push(`${defenderName} esquivó un ataque peligroso.`);
      roundText += line;

      turn = defender;
    } else {
      let damage = Math.floor(Math.random() * 26) + 15;
      const critical = Math.random() < 0.22;

      if (critical) {
        damage *= 2;

        const line1 = `${pick(crits)}`;
        const line2 = `💥 ${attackerName} ${pick(attacks)}.`;

        log.push(line1, line2);
        shortStory.push(`${attackerName} conectó un golpe crítico contra ${defenderName}.`);

        roundText += `${line1}\n${line2}\n`;
      } else {
        const line = `⚔️ ${attackerName} ${pick(attacks)}.`;

        log.push(line);
        shortStory.push(`${attackerName} atacó a ${defenderName}.`);

        roundText += `${line}\n`;
      }

      if (defender === challenger) hp1 -= damage;
      else hp2 -= damage;

      hp1 = Math.max(0, hp1);
      hp2 = Math.max(0, hp2);

      const damageLine = `🩸 ${defenderName} perdió *${damage} HP*.`;

      log.push(damageLine);
      roundText += damageLine;

      turn = defender;
    }

    roundText += `

━━━━━━━━━━━━━━

🥷 ${p1}
${progressBar(hp1)} *${hp1} HP*

🗡️ ${p2}
${progressBar(hp2)} *${hp2} HP*`;

    await safeEdit(
      sock,
      remoteJid,
      sent.key,
      roundText,
      [challenger, opponent]
    );
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
    jackpotText = '\n💎 *JACKPOT RARO:* el público lanzó XP al ganador.';
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
`🏁 *DUELO TERMINADO* 🏁

🥷 ${p1}
${progressBar(hp1)} *${hp1} HP*

🗡️ ${p2}
${progressBar(hp2)} *${hp2} HP*

🏆 Ganador: ${winnerName}`,
    [challenger, opponent]
  );

  const resumenCorto = shortStory.slice(0, 5).join('\n');

  const finalText =
`📜 *RESUMEN DEL DUELO*

${resumenCorto}

En el último intercambio, ${loserName} ${pick(fatalities)}.

━━━━━━━━━━━━━━

🏆 *GANADOR:* ${winnerName}

⭐ Recompensa: *+${reward} XP*
💸 Perdedor: *-${lost} XP*
${bet > 0 ? `🎰 Apuesta inicial: *${bet} XP*` : ''}${jackpotText}`;

  await sock.sendMessage(remoteJid, {
    text: finalText,
    mentions: [challenger, opponent]
  });
}

module.exports = {
  commands: ['duelo', 'aceptar', 'rechazar'],

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

    if (command === 'rechazar') {
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

    if (command === 'aceptar') {
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

      return finishDuel(
        sock,
        remoteJid,
        duel.challenger,
        duel.opponent,
        duel.bet
      );
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
.aceptar
.rechazar`
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
`⚔️ *DUELO PROPUESTO*

🥷 Retador: ${mention(sender)}
🗡️ Rival: ${mention(target)}
${bet > 0 ? `🎰 Apuesta: *${bet} XP*` : '🎰 Apuesta: *sin apuesta*'}

⏳ ${mention(target)}, tienes *60 segundos* para responder:

✅ *.aceptar*
❌ *.rechazar*`,
      mentions: [sender, target]
    }, { quoted: msg });
  }
};
