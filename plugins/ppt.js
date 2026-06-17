'use strict';

const pendingGames = new Map();

const BOT_NAME = 'SiriusBot';
const BOT_WIN_RATE = 0.66;
const RESPONSE_TIME = 3 * 60 * 1000;

const OPTIONS = ['piedra', 'papel', 'tijera'];

function mention(jid = '') {
  return '@' + jid.split('@')[0];
}

function normalizeChoice(text = '') {
  text = String(text).toLowerCase().trim();

  if (text === 'piedra') return 'piedra';
  if (text === 'papel') return 'papel';
  if (text === 'tijera') return 'tijera';

  return null;
}

function getTarget(msg, args) {
  const mentioned =
    msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

  if (mentioned) return mentioned;

  const quoted =
    msg.message?.extendedTextMessage?.contextInfo?.participant;

  if (quoted) return quoted;

  if (args[0]) {
    const num = args[0].replace(/\D/g, '');

    if (num) {
      return num + '@s.whatsapp.net';
    }
  }

  return null;
}

function winnerMove(move) {
  if (move === 'piedra') return 'papel';
  if (move === 'papel') return 'tijera';
  return 'piedra';
}

function randomMove() {
  return OPTIONS[Math.floor(Math.random() * OPTIONS.length)];
}

function beats(a, b) {
  return (
    (a === 'piedra' && b === 'tijera') ||
    (a === 'papel' && b === 'piedra') ||
    (a === 'tijera' && b === 'papel')
  );
}

module.exports = {
  commands: ['ppt'],

  async execute(ctx) {
    const {
      sock,
      msg,
      remoteJid,
      sender,
      args,
      db
    } = ctx;

    const target = getTarget(msg, args);

    // -------------------
    // VS BOT
    // -------------------
    if (!target) {
      const move = normalizeChoice(args[0]);

      if (!move) {
        return sock.sendMessage(remoteJid, {
          text:
`🎮 *PIEDRA PAPEL O TIJERA*

📌 Contra SiriusBot:
.ppt piedra
.ppt papel
.ppt tijera

📌 Contra jugador:
.ppt @usuario
.ppt @usuario 500

🎰 Puedes apostar XP.`
        }, { quoted: msg });
      }

      const bet = Math.max(
        100,
        Number(args[1]) || 100
      );

      const user = await db.getUser(sender);

      if ((user.xp || 0) < bet) {
        return sock.sendMessage(remoteJid, {
          text:
`❌ No tienes suficiente XP.

🎖️ XP: ${user.xp || 0}
💸 Apuesta: ${bet}`
        }, { quoted: msg });
      }

      await db.removeXP(sender, bet);

      let botMove;

      const roll = Math.random();

      if (roll < BOT_WIN_RATE) {
        botMove = winnerMove(move);
      } else {
        botMove = randomMove();
      }

      let text =
`🎮 *PIEDRA PAPEL O TIJERA*

👤 Jugador: ${mention(sender)}
🤖 Rival: ${BOT_NAME}

🥷 Tú: ${move}
🤖 Bot: ${botMove}

`;

      if (move === botMove) {
        await db.addXP(sender, bet);

        text +=
`🤝 EMPATE

💰 Recuperaste tu apuesta.

🎖️ XP actual: ${(await db.getUser(sender)).xp}`;
      }

      else if (beats(move, botMove)) {
        const reward = bet * 2;

        await db.addXP(sender, reward);

        text +=
`🏆 GANASTE

💸 Apostaste: ${bet}
⭐ Premio: ${reward}

🎖️ XP actual: ${(await db.getUser(sender)).xp}`;
      }

      else {
        text +=
`💀 PERDISTE

❌ Pierdes ${bet} XP

🎖️ XP actual: ${(await db.getUser(sender)).xp}`;
      }

      return sock.sendMessage(remoteJid, {
        text,
        mentions: [sender]
      }, { quoted: msg });
    }

    // -------------------
    // VS JUGADOR
    // -------------------

    if (target === sender) {
      return sock.sendMessage(remoteJid, {
        text: '❌ No puedes retarte a ti mismo.'
      }, { quoted: msg });
    }

    const bet =
      Math.max(
        0,
        Number(args.find(a => /^\d+$/.test(a)) || 0)
      );

    if (bet > 0) {
      const challenger = await db.getUser(sender);
      const opponent = await db.getUser(target);

      if ((challenger.xp || 0) < bet) {
        return sock.sendMessage(remoteJid, {
          text: '❌ No tienes suficiente XP.'
        }, { quoted: msg });
      }

      if ((opponent.xp || 0) < bet) {
        return sock.sendMessage(remoteJid, {
          text: '❌ El rival no tiene suficiente XP.'
        }, { quoted: msg });
      }
    }

    const gameId =
      Date.now() +
      '_' +
      sender +
      '_' +
      target;

    const timer = setTimeout(async () => {
      const game = pendingGames.get(gameId);

      if (!game) return;

      pendingGames.delete(gameId);

      try {
        await sock.sendMessage(game.group, {
          text:
`⏰ *Partida cancelada*

${mention(game.target)} no respondió dentro de los 3 minutos.`,
          mentions: [game.target]
        });
      } catch {}
    }, RESPONSE_TIME);

    pendingGames.set(gameId, {
      id: gameId,
      group: remoteJid,
      sender,
      target,
      bet,
      timer,
      senderMove: null,
      targetMove: null
    });

    try {
      await sock.sendMessage(sender, {
        text:
`🎮 *RETO PPT*

Elegiste retar a ${target.split('@')[0]}.

Responde únicamente:

🪨 piedra
📄 papel
✂️ tijera

⏳ Tiempo: 3 minutos.`
      });

      await sock.sendMessage(target, {
        text:
`🎮 *TE HAN RETADO*

👤 ${sender.split('@')[0]} te retó a Piedra Papel o Tijera.

${bet > 0 ? `💸 Apuesta: ${bet} XP\n\n` : ''}Responde únicamente:

🪨 piedra
📄 papel
✂️ tijera

⏳ Tiempo: 3 minutos.`
      });
    } catch {
      clearTimeout(timer);
      pendingGames.delete(gameId);

      return sock.sendMessage(remoteJid, {
        text: '❌ No pude enviar mensajes privados.'
      }, { quoted: msg });
    }

    return sock.sendMessage(remoteJid, {
      text:
`🎮 *RETO ENVIADO*

📨 Se enviaron mensajes privados a ambos jugadores.

🥷 ${mention(sender)}
🆚
⚔️ ${mention(target)}

${bet > 0 ? `💸 Apuesta: ${bet} XP\n` : ''}
⏳ Esperando respuestas...`,
      mentions: [sender, target]
    }, { quoted: msg });
  }
};

module.exports.pendingGames = pendingGames;
module.exports.normalizeChoice = normalizeChoice;
module.exports.beats = beats;
