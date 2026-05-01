'use strict';

const activeGames = new Map();

const LETTERS = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');

function getRandomLetter() {
  return LETTERS[Math.floor(Math.random() * LETTERS.length)];
}

function formatGame(letter, time) {
  return `╔═══「 🍉 TUTTI FRUTTI 」═══╗

🔤 Letra: *${letter}*
⏳ Tiempo: *${time}s*

Responde con este formato:

Nombre:
Apellido:
Fruta:
Cosa:
Animal:
País:
Color:

Ejemplo:
Nombre: Ana
Apellido: Alvarez
Fruta: Arándano
...

╚══════════════════════╝`;
}

module.exports = {
  commands: ['tutti', 'tuttifrutti'],

  async execute(ctx) {
    const { sock, remoteJid, msg } = ctx;

    if (activeGames.has(remoteJid)) {
      return sock.sendMessage(remoteJid, {
        text: '⚠️ Ya hay un juego en curso.'
      }, { quoted: msg });
    }

    const letter = getRandomLetter();
    const duration = 60 * 1000;

    const game = {
      letter,
      players: new Set()
    };

    activeGames.set(remoteJid, game);

    await sock.sendMessage(remoteJid, {
      text: formatGame(letter, 60)
    }, { quoted: msg });

    setTimeout(async () => {
      activeGames.delete(remoteJid);

      await sock.sendMessage(remoteJid, {
        text: '⏰ Tiempo terminado.\n\n🎉 Fin del juego.'
      });

    }, duration);
  },

  async onMessage(ctx) {
    const { remoteJid, body, sender, sock } = ctx;

    const game = activeGames.get(remoteJid);
    if (!game) return;

    const text = (body || '').toLowerCase();

    // evitar que respondan varias veces
    if (game.players.has(sender)) return;

    // detectar si parece respuesta válida
    if (!text.includes('nombre') || !text.includes('animal')) return;

    // validar letra
    const letter = game.letter.toLowerCase();

    const valid = text
      .split('\n')
      .some(line => line.trim().startsWith(letter));

    if (!valid) return;

    game.players.add(sender);

    await sock.sendMessage(remoteJid, {
      text: `✅ @${sender.split('@')[0]} respondió correctamente 🎉`,
      mentions: [sender]
    });
  }
};
