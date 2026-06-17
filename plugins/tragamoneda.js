'use strict';

const EMOJIS = [
  '7️⃣',
  '🍒',
  '🍋',
  '🍉',
  '🍇',
  '💎'
];

function randomEmoji() {
  return EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatTime(ms) {
  const total = Math.ceil(ms / 1000);

  const minutes = Math.floor(total / 60);
  const seconds = total % 60;

  if (minutes <= 0) {
    return `${seconds} seg`;
  }

  return `${minutes} min ${seconds} seg`;
}

module.exports = {
  commands: ['slot', 'casino', '777'],

  async execute(ctx) {
    const {
      sock,
      msg,
      remoteJid,
      sender,
      args,
      db
    } = ctx;

    try {
      const user = await db.getUser(sender);

      const cooldown = 5 * 60 * 1000;
      const lastSlot = Number(user.lastSlot || 0);

      if (Date.now() - lastSlot < cooldown) {
        const remaining = cooldown - (Date.now() - lastSlot);

        return sock.sendMessage(remoteJid, {
          text:
`⏳ Ya jugaste recientemente.

🎰 Debes esperar:
${formatTime(remaining)}

para volver a usar el tragamonedas.`
        }, { quoted: msg });
      }

      const bet = Math.max(
        1,
        parseInt(args[0]) || 500
      );

      if ((user.xp || 0) < bet) {
        return sock.sendMessage(remoteJid, {
          text:
`❌ No tienes suficiente XP.

🎖️ XP actual: ${user.xp || 0}
💸 Apuesta: ${bet}`
        }, { quoted: msg });
      }

      user.lastSlot = Date.now();
      await db.setUser(sender, user);

      await db.removeXP(sender, bet);

      const sent = await sock.sendMessage(remoteJid, {
        text:
`🎰 *TRAGAMONEDAS* 🎰

┏━━━━━━━━━━━┓
┃ ${randomEmoji()} │ ${randomEmoji()} │ ${randomEmoji()} ┃
┗━━━━━━━━━━━┛

🎲 Girando...`
      }, { quoted: msg });

      await sleep(1000);

      await sock.sendMessage(remoteJid, {
        text:
`🎰 *TRAGAMONEDAS* 🎰

┏━━━━━━━━━━━┓
┃ ${randomEmoji()} │ ${randomEmoji()} │ ${randomEmoji()} ┃
┗━━━━━━━━━━━┛

🎲 Girando...`,
        edit: sent.key
      });

      await sleep(1000);

      await sock.sendMessage(remoteJid, {
        text:
`🎰 *TRAGAMONEDAS* 🎰

┏━━━━━━━━━━━┓
┃ ${randomEmoji()} │ ${randomEmoji()} │ ${randomEmoji()} ┃
┗━━━━━━━━━━━┛

🎲 Girando...`,
        edit: sent.key
      });

      await sleep(1000);

      const r1 = randomEmoji();
      const r2 = randomEmoji();
      const r3 = randomEmoji();

      let multiplier = 0;
      let result = '💀 Mala suerte';

      // JACKPOT 777
      if (
        r1 === '7️⃣' &&
        r2 === '7️⃣' &&
        r3 === '7️⃣'
      ) {
        multiplier = 5;
        result = '💥 JACKPOT 777 💥';
      }

      // TRES IGUALES
      else if (
        r1 === r2 &&
        r2 === r3
      ) {
        multiplier = 3;
        result = '🔥 ¡Tres iguales!';
      }

      // DOS IGUALES
      else if (
        r1 === r2 ||
        r1 === r3 ||
        r2 === r3
      ) {
        multiplier = 1.5;
        result = '✨ Dos iguales';
      }

      let reward = 0;

      if (multiplier > 0) {
        reward = Math.floor(bet * multiplier);
        await db.addXP(sender, reward);
      }

      const finalUser = await db.getUser(sender);

      await sock.sendMessage(remoteJid, {
        text:
`🎰 *TRAGAMONEDAS* 🎰

┏━━━━━━━━━━━┓
┃ ${r1} │ ${r2} │ ${r3} ┃
┗━━━━━━━━━━━┛

${result}

💸 Apostaste: ${bet} XP
${reward > 0
  ? `🏆 Ganaste: ${reward} XP`
  : `💀 Perdiste: ${bet} XP`
}

🎖️ XP actual: ${finalUser.xp || 0}`,
        edit: sent.key
      });

    } catch (err) {
      console.log('❌ Error en slot:', err?.message || err);

      return sock.sendMessage(remoteJid, {
        text: '❌ Ocurrió un error al jugar.'
      }, { quoted: msg });
    }
  }
};
