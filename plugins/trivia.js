'use strict';

const trivia = require('../lib/trivia');
const db = require('../lib/database');

const TIME_LIMIT = 60 * 1000;

module.exports = {
  commands: ['trivia'],

  async execute({ sock, msg, remoteJid }) {
    const game = trivia.start(remoteJid);

    if (!game) {
      return sock.sendMessage(remoteJid, {
        text: '⚠️ Ya hay una trivia en curso.'
      }, { quoted: msg });
    }

    sendQuestion(sock, remoteJid, game, msg);
  },

  async onMessage(ctx) {
    const { sock, msg, remoteJid, body, sender } = ctx;

    if (!body) return;

    const current = trivia.get();
    if (!current) return;
    if (current.chat !== remoteJid) return;

    // Evita que comandos como .menu o .trivia cuenten como respuesta
    if (body.trim().startsWith('.')) return;

    const correct = trivia.check(body);
    if (!correct) return;

    if (current.timeout) clearTimeout(current.timeout);

    // 🔥 MÁS EXPERIENCIA Y MAYOR VARIANZA: Entre 500 y 2000 XP
    const xp = Math.floor(Math.random() * 1501) + 500;
    await db.addXP(sender, xp);

    await sock.sendMessage(remoteJid, {
      text:
`🏆 *RESPUESTA CORRECTA*

👤 Ganador: @${sender.split('@')[0]}
✅ Respuesta: *${current.answer}*
⭐ Premio: *+${xp} XP*`,
      mentions: [sender]
    }, { quoted: msg });

    const next = trivia.next();

    if (!next) {
      trivia.stop();
      return;
    }

    sendQuestion(sock, remoteJid, next);
  }
};

function sendQuestion(sock, jid, game, quotedMsg = null) {
  game.timeout = setTimeout(async () => {
    const current = trivia.get();

    if (current && current.chat === jid) {
      await sock.sendMessage(jid, {
        text:
`⏰ *TIEMPO TERMINADO*

❓ ${current.question}
❌ Nadie respondió
✅ Respuesta: *${current.answer}*

🎮 Escribe *.trivia* para jugar de nuevo`
      });

      trivia.stop();
    }
  }, TIME_LIMIT);

  return sock.sendMessage(
    jid,
    {
      text:
`🎯 *TRIVIA*

❓ ${game.question}

⏱️ 60 segundos
💬 Todos pueden responder sin usar punto
🏆 Premio: *500 - 2000 XP*

Ejemplo:
*lima*
o
*creo que es lima*`
    },
    quotedMsg ? { quoted: quotedMsg } : {}
  );
}
