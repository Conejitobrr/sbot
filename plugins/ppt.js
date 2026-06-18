'use strict';

global.pendingPPTGames = global.pendingPPTGames || new Map();

const pendingGames = global.pendingPPTGames;

const BOT_NAME = 'SiriusBot';
const RESPONSE_TIME = 3 * 60 * 1000;

function mention(jid = '') {
  return '@' + jid.split('@')[0];
}

function getTarget(msg, args) {
  const mentioned =
    msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

  if (mentioned) return mentioned;

  const quoted =
    msg.message?.extendedTextMessage?.contextInfo?.participant;

  if (quoted) return quoted;

  return null;
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

    const move = String(args[0] || '').toLowerCase();
    const target = getTarget(msg, args);

    // VS BOT
    if (!target) {

      if (!['piedra', 'papel', 'tijera'].includes(move)) {
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
          text: '❌ No tienes suficiente XP.'
        }, { quoted: msg });
      }

      await db.removeXP(sender, bet);

      // 🔥 CAMBIO: Bot elige al azar (Probabilidad justa)
      const moves = ['piedra', 'papel', 'tijera'];
      const botMove = moves[Math.floor(Math.random() * moves.length)];

      let text =
`🎮 PIEDRA PAPEL O TIJERA

👤 ${mention(sender)}
🤖 ${BOT_NAME}

🥷 Tú: ${move}
🤖 Bot: ${botMove}

`;

      if (move === botMove) {
        await db.addXP(sender, bet);

        text += '🤝 EMPATE';
      }

      else if (beats(move, botMove)) {
        const reward = bet * 2;

        await db.addXP(sender, reward);

        text += `🏆 GANASTE\n\n⭐ Premio: ${reward} XP`;
      }

      else {
        text += `💀 PERDISTE\n\n❌ Pierdes ${bet} XP`;
      }

      return sock.sendMessage(remoteJid, {
        text,
        mentions: [sender]
      }, { quoted: msg });
    }

    // VS JUGADOR

    if (target === sender) {
      return sock.sendMessage(remoteJid, {
        text: '❌ No puedes jugar contigo mismo.'
      }, { quoted: msg });
    }

    const bet =
      Number(args.find(a => /^\d+$/.test(a)) || 0);

    if (bet > 0) {
      const p1 = await db.getUser(sender);
      const p2 = await db.getUser(target);

      if ((p1.xp || 0) < bet) {
        return sock.sendMessage(remoteJid, {
          text: '❌ No tienes suficiente XP.'
        }, { quoted: msg });
      }

      if ((p2.xp || 0) < bet) {
        return sock.sendMessage(remoteJid, {
          text: '❌ El rival no tiene suficiente XP.'
        }, { quoted: msg });
      }
    }

    const id = Date.now() + '_' + sender;

    const timer = setTimeout(async () => {
      const game = pendingGames.get(id);

      if (!game) return;

      pendingGames.delete(id);

      await sock.sendMessage(game.group, {
        text:
`⏰ Partida cancelada

${mention(game.target)} no respondió.`,
        mentions: [game.target]
      });
    }, RESPONSE_TIME);

    pendingGames.set(id, {
      id,
      group: remoteJid,
      sender,
      target,
      bet,
      senderMove: null,
      targetMove: null,
      timer
    });

    await sock.sendMessage(sender, {
      text:
`🎮 *RETO PPT*

Responde únicamente:

🪨 piedra
📄 papel
✂️ tijera

⏳ Tiempo: 3 minutos.`
    });

    await sock.sendMessage(target, {
      text:
`🎮 *TE RETÓ A PPT* ${sender.split('@')[0]}

${bet > 0 ? `💸 Apuesta: ${bet} XP\n\n` : ''}

Responde únicamente:

🪨 piedra
📄 papel
✂️ tijera

⏳ Tiempo: 3 minutos.`
    });

    return sock.sendMessage(remoteJid, {
      text:
`🎮 *RETO ENVIADO*

📨 Se enviaron mensajes privados a ambos jugadores.

🥷 ${mention(sender)}
🆚
⚔️ ${mention(target)}

⏳ Esperando respuestas...`,
      mentions: [sender, target]
    }, { quoted: msg });
  }
};
