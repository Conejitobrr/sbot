'use strict';

const games = new Map();

const LETTERS = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');

function randomLetter() {
  return LETTERS[Math.floor(Math.random() * LETTERS.length)];
}

function normalize(text = '') {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function getMention(jid = '') {
  return '@' + jid.split('@')[0];
}

function parseAnswer(text = '') {
  const lines = text.split('\n');

  const data = {
    nombre: '',
    apellido: '',
    fruta: '',
    cosa: '',
    animal: '',
    pais: '',
    color: ''
  };

  for (const line of lines) {
    const [rawKey, ...rest] = line.split(':');
    if (!rawKey || !rest.length) continue;

    const key = normalize(rawKey).replace(/\s/g, '');
    const value = rest.join(':').trim();

    if (key === 'nombre') data.nombre = value;
    if (key === 'apellido') data.apellido = value;
    if (key === 'fruta') data.fruta = value;
    if (key === 'cosa') data.cosa = value;
    if (key === 'animal') data.animal = value;
    if (key === 'pais' || key === 'país') data.pais = value;
    if (key === 'color') data.color = value;
  }

  return data;
}

function startsWithLetter(value, letter) {
  return normalize(value).startsWith(normalize(letter));
}

function scoreAnswer(data, letter) {
  let score = 0;
  const errors = [];

  for (const [key, value] of Object.entries(data)) {
    if (!value) {
      errors.push(`❌ ${key}: vacío`);
      continue;
    }

    if (!startsWithLetter(value, letter)) {
      errors.push(`❌ ${key}: no empieza con ${letter}`);
      continue;
    }

    score += 10;
  }

  return { score, errors };
}

function gameText(letter, seconds) {
  return `╔═══「 🍉 TUTTI FRUTTI PRO 」═══╗

🔤 Letra elegida: *${letter}*
⏳ Tiempo: *${seconds} segundos*

📌 Categorías:
➤ Nombre
➤ Apellido
➤ Fruta
➤ Cosa
➤ Animal
➤ País
➤ Color

🧠 Cada respuesta correcta vale *10 puntos*.
🏆 Máximo: *70 puntos*.

👇 Copia la plantilla que enviaré abajo y respóndela.

╚══════════════════════╝`;
}

function templateText() {
  return `Nombre:
Apellido:
Fruta:
Cosa:
Animal:
País:
Color:`;
}

module.exports = {
  commands: ['tutti', 'tuttifrutti', 'frutti'],

  async execute(ctx) {
    const { sock, msg, remoteJid, args } = ctx;

    if (!remoteJid.endsWith('@g.us')) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Este juego solo funciona en grupos.'
      }, { quoted: msg });
    }

    if (games.has(remoteJid)) {
      return sock.sendMessage(remoteJid, {
        text: '⚠️ Ya hay una partida de Tutti Frutti en curso.'
      }, { quoted: msg });
    }

    const seconds = Number(args[0]) || 60;
    const letter = randomLetter();

    games.set(remoteJid, {
      letter,
      startedAt: Date.now(),
      endsAt: Date.now() + seconds * 1000,
      players: new Map()
    });

    await sock.sendMessage(remoteJid, {
      text: gameText(letter, seconds)
    }, { quoted: msg });

    await sock.sendMessage(remoteJid, {
      text:
`📋 *PLANTILLA PARA COPIAR Y PEGAR:*

${templateText()}`
    });

    setTimeout(async () => {
      const game = games.get(remoteJid);
      if (!game) return;

      games.delete(remoteJid);

      if (!game.players.size) {
        return sock.sendMessage(remoteJid, {
          text: `⏰ Tiempo terminado.\n\nNadie respondió 😶`
        });
      }

      const ranking = [...game.players.entries()]
        .sort((a, b) => b[1].score - a[1].score);

      let result = `⏰ *TIEMPO TERMINADO*\n\n🏆 *RESULTADOS TUTTI FRUTTI*\n\n🔤 Letra: *${game.letter}*\n\n`;

      let mentions = [];

      ranking.forEach(([jid, data], index) => {
        mentions.push(jid);

        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🎮';

        result += `${medal} ${index + 1}. ${getMention(jid)} → *${data.score} pts*\n`;
      });

      const winner = ranking[0];
      if (winner) {
        result += `\n🎉 Ganador: ${getMention(winner[0])}`;
      }

      await sock.sendMessage(remoteJid, {
        text: result,
        mentions
      });

    }, seconds * 1000);
  },

  async onMessage(ctx) {
    const { sock, remoteJid, body, sender, msg } = ctx;

    const game = games.get(remoteJid);
    if (!game) return;

    if (Date.now() > game.endsAt) return;
    if (game.players.has(sender)) return;

    const text = body || '';

    if (
      !normalize(text).includes('nombre:') ||
      !normalize(text).includes('apellido:') ||
      !normalize(text).includes('fruta:') ||
      !normalize(text).includes('animal:')
    ) {
      return;
    }

    const data = parseAnswer(text);
    const result = scoreAnswer(data, game.letter);

    game.players.set(sender, {
      data,
      score: result.score,
      errors: result.errors
    });

    if (result.score === 70) {
      return sock.sendMessage(remoteJid, {
        text: `✅ ${getMention(sender)} respondió perfecto.\n\n🏆 Puntaje: *70/70*`,
        mentions: [sender]
      }, { quoted: msg });
    }

    return sock.sendMessage(remoteJid, {
      text:
`✅ ${getMention(sender)} respondió.

📊 Puntaje: *${result.score}/70*

${result.errors.length ? result.errors.join('\n') : 'Sin errores.'}`,
      mentions: [sender]
    }, { quoted: msg });
  }
};
