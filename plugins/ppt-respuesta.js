'use strict';

global.pendingPPTGames = global.pendingPPTGames || new Map();

const pendingGames = global.pendingPPTGames;

function mention(jid = '') {
  return '@' + jid.split('@')[0];
}

function normalizeChoice(text = '') {
  text = String(text).toLowerCase().trim();

  if (['piedra', '🪨', 'p'].includes(text)) {
    return 'piedra';
  }

  if (['papel', '📄', 'pa'].includes(text)) {
    return 'papel';
  }

  if (['tijera', '✂️', '✂', 't'].includes(text)) {
    return 'tijera';
  }

  return null;
}

function beats(a, b) {
  return (
    (a === 'piedra' && b === 'tijera') ||
    (a === 'papel' && b === 'piedra') ||
    (a === 'tijera' && b === 'papel')
  );
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
`❌ La apuesta fue anulada.

Uno de los jugadores ya no tiene suficiente XP.`
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

    const game = [...pendingGames.values()].find(g =>
      (g.sender === sender || g.target === sender) &&
      (
        (g.sender === sender && !g.senderMove) ||
        (g.target === sender && !g.targetMove)
      )
    );

    if (!game) {
      return sock.sendMessage(remoteJid, {
        text:
`⚠️ No tienes ninguna partida PPT pendiente.`
      });
    }

    if (sender === game.sender) {
      game.senderMove = move;
    }

    if (sender === game.target) {
      game.targetMove = move;
    }

    await sock.sendMessage(remoteJid, {
      text:
`✅ Respuesta recibida

🎮 Elegiste: *${move}*

${game.senderMove && game.targetMove
  ? '⚡ Ambos jugadores respondieron.'
  : '⏳ Esperando al otro jugador...'
}`
    });

    if (
      game.senderMove &&
      game.targetMove
    ) {
      try {
        await sock.sendMessage(game.sender, {
          text: '⚡ Ambos jugadores respondieron. Calculando resultado...'
        });

        await sock.sendMessage(game.target, {
          text: '⚡ Ambos jugadores respondieron. Calculando resultado...'
        });
      } catch {}

      await finishGame(sock, game, db);
    }
  }
};
