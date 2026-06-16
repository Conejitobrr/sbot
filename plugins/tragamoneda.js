'use strict';

const cooldowns = new Map();

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
      const cooldown = cooldowns.get(sender);

      if (cooldown && cooldown > Date.now()) {
        const seconds = Math.ceil((cooldown - Date.now()) / 1000);

        return sock.sendMessage(remoteJid, {
          text: `⏳ Debes esperar ${seconds} segundos para volver a jugar.`
        }, { quoted: msg });
      }

      cooldowns.set(sender, Date.now() + 10000);

      const user = await db.getUser(sender);

      const bet = Math.max(
        1,
        parseInt(args[0]) || 500
      );

      if ((user.xp || 0) < bet) {
        return sock.sendMessage(remoteJid, {
          text:
`❌ No tienes suficiente XP.

🎖️ XP actual: ${user.xp || 0}
💰 Apuesta: ${bet}`
        }, { quoted: msg });
      }

      await db.removeXP(sender, bet);

      const r1 = randomEmoji();
      const r2 = randomEmoji();
      const r3 = randomEmoji();

      let multiplier = 0;
      let result = '😢 Mala suerte';

      // JACKPOT 777
      if (r1 === '7️⃣' && r2 === '7️⃣' && r3 === '7️⃣') {
        multiplier = 5;
        result = '💥 JACKPOT 777 💥';
      }

      // TRES IGUALES
      else if (r1 === r2 && r2 === r3) {
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

      const text =
`🎰 *TRAGAMONEDAS* 🎰

┏━━━━━━━━━━━┓
┃ ${r1} │ ${r2} │ ${r3} ┃
┗━━━━━━━━━━━┛

${result}

💸 Apostaste: ${bet} XP
${reward > 0 ? `🏆 Ganaste: ${reward} XP` : `💀 Perdiste: ${bet} XP`}

🎖️ XP actual: ${finalUser.xp || 0}`;

      await sock.sendMessage(remoteJid, {
        text
      }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error en slot:', err?.message || err);

      return sock.sendMessage(remoteJid, {
        text: '❌ Ocurrió un error al jugar.'
      }, { quoted: msg });
    }
  }
};
