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

    await sock.sendMessage(remoteJid, {
      text: `
🎯 *TRIVIA ACTIVADA*

❓ ${game.question}

💬 Todos pueden responder
⏱️ Tienes 60 segundos
🏆 El primero gana XP
`
    });

    // ⏱️ TIEMPO LÍMITE
    setTimeout(async () => {
      const current = trivia.get();

      if (current && current.chat === remoteJid) {

        await sock.sendMessage(remoteJid, {
          text: `
⏰ *TIEMPO TERMINADO*

❓ ${current.question}
✅ Respuesta correcta: *${current.answer}*
`
        });

        trivia.stop();
      }
    }, 60000); // 60s
  }
};
