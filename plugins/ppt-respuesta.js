'use strict';

const ppt = require('./ppt');

const pendingGames = ppt.pendingGames;
const normalizeChoice = ppt.normalizeChoice;
const beats = ppt.beats;

function mention(jid = '') {
  return '@' + jid.split('@')[0];
}

async function finishGame(sock, game, db) {
  clearTimeout(game.timer);

  const p1 = game.senderMove;
  const p2 = game.targetMove;

  let text =
`🎮 *PIEDRA PAPEL O TIJERA*

🥷 ${mention(game.sender)}
➡️ ${p1}

⚔️ ${mention(game.target)}
➡️ ${p2}

━━━━━━━━━━━━━━

`;

  if (p1 === p2) {
    text +=
`🤝 *EMPATE*

Nadie gana XP.`;

    await sock.sendMessage(game.group, {
      text,
      mentions: [game.sender, game.target]
    });

    pendingGames.delete(game.id);
    return;
  }

  const winner =
    beats(p1, p2)
      ? game.sender
      : game.target;

  const loser =
    winner === game.sender
      ? game.target
      : game.sender;

  if (game.bet > 0) {
    const winnerData = await db.getUser(winner);
    const loserData = await db.getUser(loser);

    if (
      (winnerData.xp || 0) < game.bet ||
      (loserData.xp || 0) < game.bet
    ) {
      await sock.sendMessage(game.group, {
        text:
`❌ La partida fue anulada.

Uno de los jugadores ya no tiene suficiente XP para cubrir la apuesta.`
      });

      pendingGames.delete(game.id);
      return;
    }

    await db.removeXP(loser, game.bet);
    await db.addXP(winner, game.bet);
  }

  text +=
`🏆 *GANADOR*

${mention(winner)}

${game.bet > 0
  ? `💸 Ganó ${game.bet} XP`
  : '🎉 Victoria sin apuesta'
}`;

  await sock.sendMessage(game.group, {
    text,
    mentions: [game.sender, game.target]
  });

  pendingGames.delete(game.id);
}

module.exports = {
  async onMessage(ctx) {
    const {
      sock,
      msg,
      sender,
      remoteJid,
      body,
      db
    } = ctx;

    if (!body) return;

    // Solo privados
    if (remoteJid.endsWith('@g.us')) {
      return;
    }

    const move = normalizeChoice(body);

    if (!move) return;

    const games = [...pendingGames.values()];

    const game = games.find(g =>
      (g.sender === sender || g.target === sender) &&
      (
        (g.sender === sender && !g.senderMove) ||
        (g.target === sender && !g.targetMove)
      )
    );

    if (!game) return;

    if (sender === game.sender) {
      game.senderMove = move;
    }

    if (sender === game.target) {
      game.targetMove = move;
    }

    try {
      await sock.sendMessage(remoteJid, {
        text: `✅ Elegiste: *${move}*`
      });
    } catch {}

    if (!game.senderMove || !game.targetMove) {
      return;
    }

    await finishGame(sock, game, db);
  }
};
