'use strict';

const trivia = require('../lib/trivia');

module.exports = {
  commands: ['trivia'],

  async execute({ sock, remoteJid }) {

    const game = trivia.start(remoteJid);

    if (!game) {
      return sock.sendMessage(remoteJid, {
        text: '⚠️ Ya hay una trivia en curso'
      });
    }

    sendQuestion(sock, remoteJid, game);
  }
};

// 🔥 función para enviar preguntas + tiempo
function sendQuestion(sock, jid, game) {

  sock.sendMessage(jid, {
    text: `
🎯 *TRIVIA*

❓ ${game.question}

⏱️ 60 segundos
💬 Todos pueden responder
`
  });

  // ⏱️ tiempo límite
  game.timeout = setTimeout(async () => {

    const current = require('../lib/trivia').get();

    if (current && current.chat === jid) {

      await sock.sendMessage(jid, {
        text: `
⏰ *TIEMPO TERMINADO*

❓ ${current.question}
❌ Nadie respondió
✅ Respuesta: *${current.answer}*

🎮 Escribe *.trivia* para jugar de nuevo
`
      });

      require('../lib/trivia').stop();
    }

  }, 60000);
}
