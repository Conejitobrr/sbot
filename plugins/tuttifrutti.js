'use strict';

const games = new Map();

const LETTERS = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');

const CATEGORIES = [
  'nombre',
  'apellido',
  'fruta',
  'cosa',
  'animal',
  'pais',
  'color'
];

const MAX_ROUNDS = 5;
const DEFAULT_SECONDS = 75;
const SHOW_SECONDS = 10;

function randomLetter() {
  return LETTERS[Math.floor(Math.random() * LETTERS.length)];
}

function normalize(text = '') {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function mention(jid = '') {
  return '@' + jid.split('@')[0];
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

function parseAnswer(text = '') {
  const data = {
    nombre: '',
    apellido: '',
    fruta: '',
    cosa: '',
    animal: '',
    pais: '',
    color: ''
  };

  for (const line of text.split('\n')) {
    const [rawKey, ...rest] = line.split(':');
    if (!rawKey || !rest.length) continue;

    const key = normalize(rawKey).replace(/\s/g, '');
    const value = rest.join(':').trim();

    if (key === 'nombre') data.nombre = value;
    if (key === 'apellido') data.apellido = value;
    if (key === 'fruta') data.fruta = value;
    if (key === 'cosa') data.cosa = value;
    if (key === 'animal') data.animal = value;
    if (key === 'pais') data.pais = value;
    if (key === 'color') data.color = value;
  }

  return data;
}

function isAnswerFormat(text = '') {
  const t = normalize(text);
  return (
    t.includes('nombre:') &&
    t.includes('apellido:') &&
    t.includes('fruta:') &&
    t.includes('cosa:') &&
    t.includes('animal:') &&
    (t.includes('pais:') || t.includes('país:')) &&
    t.includes('color:')
  );
}

function startsWithLetter(value, letter) {
  return normalize(value).startsWith(normalize(letter));
}

function roundHeader(game) {
  const isFinal = game.round === MAX_ROUNDS;

  return `${isFinal ? '🔥' : '🍉'} *TUTTI FRUTTI ${isFinal ? 'RONDA FINAL' : 'PRO'}*

🔁 Ronda: *${game.round}/${MAX_ROUNDS}*
🔤 Letra: *${game.letter}*
⏳ Tiempo: *${game.seconds}s*

${isFinal
  ? `🔥 *RONDA FINAL CON PUNTOS EXTRA*
✅ Única correcta: *150 pts*
🔁 Repetida correcta: *75 pts*
🏆 Perfecto: *+200 pts*`
  : `✅ Única correcta: *100 pts*
🔁 Repetida correcta: *50 pts*`}

📌 Categorías:
➤ Nombre
➤ Apellido
➤ Fruta
➤ Cosa
➤ Animal
➤ País
➤ Color

📋 Copia la plantilla que enviaré abajo.`;
}

function scoreRound(game) {
  const isFinal = game.round === MAX_ROUNDS;
  const uniquePoints = isFinal ? 150 : 100;
  const repeatedPoints = isFinal ? 75 : 50;

  const answers = [...game.answers.entries()];
  const counts = {};

  for (const [, data] of answers) {
    for (const category of CATEGORIES) {
      const value = normalize(data[category]);
      if (!value) continue;
      if (!startsWithLetter(value, game.letter)) continue;

      const key = `${category}:${value}`;
      counts[key] = (counts[key] || 0) + 1;
    }
  }

  const results = [];

  for (const [jid, data] of answers) {
    let score = 0;
    let correct = 0;

    for (const category of CATEGORIES) {
      const value = normalize(data[category]);
      if (!value) continue;
      if (!startsWithLetter(value, game.letter)) continue;

      correct++;
      const key = `${category}:${value}`;
      score += counts[key] > 1 ? repeatedPoints : uniquePoints;
    }

    if (isFinal && correct === CATEGORIES.length) {
      score += 200;
    }

    results.push({ jid, score, correct });
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

async function sendTemplate(sock, jid) {
  await sock.sendMessage(jid, {
    text: `📋 *PLANTILLA PARA COPIAR Y PEGAR:*

${templateText()}`
  });
}

async function startRound(sock, jid) {
  const game = games.get(jid);
  if (!game) return;

  game.letter = randomLetter();
  game.answers = new Map();
  game.roundStarted = Date.now();
  game.acceptingAnswers = true;

  await sock.sendMessage(jid, { text: roundHeader(game) });
  await sendTemplate(sock, jid);

  game.roundTimer = setTimeout(async () => {
    const current = games.get(jid);
    if (!current) return;

    current.acceptingAnswers = true;

    await sock.sendMessage(jid, {
      text:
`⏰ *Tiempo terminado.*

📢 Tienen *${SHOW_SECONDS} segundos* para enviar/mostrar sus respuestas.
⚠️ Si no responden, pierden esta ronda.`
    });

    current.warningTimer = setTimeout(async () => {
      if (!games.has(jid)) return;

      await sock.sendMessage(jid, {
        text: '⚠️ *ÚLTIMOS 3 SEGUNDOS*\nSi no envías tu respuesta ahora, pierdes esta ronda ❌'
      });
    }, (SHOW_SECONDS - 3) * 1000);

    current.closeTimer = setTimeout(async () => {
      await finishRound(sock, jid);
    }, SHOW_SECONDS * 1000);

  }, game.seconds * 1000);
}

async function finishRound(sock, jid) {
  const game = games.get(jid);
  if (!game) return;

  clearTimeout(game.roundTimer);
  clearTimeout(game.warningTimer);
  clearTimeout(game.closeTimer);

  game.acceptingAnswers = false;

  const results = scoreRound(game);
  const mentions = [];

  if (!results.length) {
    game.emptyRounds++;

    await sock.sendMessage(jid, {
      text: `😶 Nadie respondió en la ronda *${game.round}*.`
    });

    if (game.emptyRounds >= 2) {
      return finishTournament(sock, jid, '😴 Se terminó por inactividad.');
    }
  } else {
    game.emptyRounds = 0;

    for (const player of game.players.keys()) {
      if (!game.answers.has(player)) {
        game.players.get(player).misses++;
      } else {
        game.players.get(player).misses = 0;
      }
    }

    const eliminated = [];

    for (const [player, info] of game.players.entries()) {
      if (info.misses >= 2) {
        eliminated.push(player);
        game.players.delete(player);
      }
    }

    let text = `📊 *RESULTADOS RONDA ${game.round}*\n🔤 Letra: *${game.letter}*\n\n`;

    results.forEach((r, i) => {
      mentions.push(r.jid);
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🎮';

      if (!game.players.has(r.jid)) {
        game.players.set(r.jid, { total: 0, misses: 0 });
      }

      game.players.get(r.jid).total += r.score;

      text += `${medal} ${mention(r.jid)} → *${r.score} pts* (${r.correct}/7)\n`;
    });

    if (eliminated.length) {
      text += `\n💀 *Eliminados por inactividad:*\n`;
      for (const e of eliminated) {
        mentions.push(e);
        text += `➤ ${mention(e)}\n`;
      }
    }

    await sock.sendMessage(jid, { text, mentions });

    if (results.length === 1 && game.round > 1) {
      return finishTournament(sock, jid, '⚠️ Solo respondió 1 jugador. Torneo finalizado.');
    }
  }

  const activePlayers = [...game.players.entries()].filter(([, info]) => info.misses < 2);

  if (game.round >= MAX_ROUNDS) {
    return finishTournament(sock, jid, '🏁 Se completaron todas las rondas.');
  }

  if (activePlayers.length === 1 && game.round > 1) {
    return finishTournament(sock, jid, '🏆 Solo queda 1 jugador activo.');
  }

  game.round++;

  setTimeout(async () => {
    if (!games.has(jid)) return;
    await startRound(sock, jid);
  }, 8000);
}

async function finishTournament(sock, jid, reason = '🏁 Torneo terminado.') {
  const game = games.get(jid);
  if (!game) return;

  clearTimeout(game.roundTimer);
  clearTimeout(game.warningTimer);
  clearTimeout(game.closeTimer);

  games.delete(jid);

  const ranking = [...game.players.entries()]
    .sort((a, b) => b[1].total - a[1].total);

  if (!ranking.length) {
    return sock.sendMessage(jid, {
      text: `${reason}\n\nNo hubo participantes con puntos.`
    });
  }

  const mentions = [];
  let text = `${reason}\n\n🏆 *RESULTADOS FINALES TUTTI FRUTTI*\n\n`;

  ranking.forEach(([player, info], i) => {
    mentions.push(player);
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🎮';
    text += `${medal} ${mention(player)} → *${info.total} pts*\n`;
  });

  text += `\n🎉 Campeón: ${mention(ranking[0][0])}`;

  await sock.sendMessage(jid, { text, mentions });
}

module.exports = {
  commands: ['tutti', 'tuttifrutti', 'frutti', 'stoptutti', 'stopfrutti'],

  async execute(ctx) {
    const { sock, msg, remoteJid, args, command, sender } = ctx;

    if (!remoteJid.endsWith('@g.us')) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Este juego solo funciona en grupos.'
      }, { quoted: msg });
    }

    if (command === 'stoptutti' || command === 'stopfrutti') {
      if (!games.has(remoteJid)) {
        return sock.sendMessage(remoteJid, {
          text: '⚠️ No hay una partida activa.'
        }, { quoted: msg });
      }

      return finishTournament(sock, remoteJid, '🛑 Torneo detenido manualmente.');
    }

    if (games.has(remoteJid)) {
      return sock.sendMessage(remoteJid, {
        text: '⚠️ Ya hay una partida de Tutti Frutti en curso.\nUsa *.stoptutti* para terminarla.'
      }, { quoted: msg });
    }

    const seconds = Math.max(30, Math.min(Number(args[0]) || DEFAULT_SECONDS, 180));

    games.set(remoteJid, {
      round: 1,
      seconds,
      letter: null,
      answers: new Map(),
      players: new Map([[sender, { total: 0, misses: 0 }]]),
      emptyRounds: 0,
      acceptingAnswers: false,
      roundTimer: null,
      warningTimer: null,
      closeTimer: null
    });

    await sock.sendMessage(remoteJid, {
      text:
`🍉 *TUTTI FRUTTI PRO ACTIVADO*

🔁 Rondas máximas: *${MAX_ROUNDS}*
⏳ Tiempo por ronda: *${seconds}s*
📢 Luego habrá *10s extra* para mostrar respuestas.

🛑 Para terminar:
*.stoptutti* o *.stopfrutti*`
    }, { quoted: msg });

    await startRound(sock, remoteJid);
  },

  async onMessage(ctx) {
    const { sock, remoteJid, body, sender, msg } = ctx;

    const game = games.get(remoteJid);
    if (!game || !game.acceptingAnswers) return;

    if (!isAnswerFormat(body)) return;

    if (game.answers.has(sender)) {
      return sock.sendMessage(remoteJid, {
        text: `⚠️ ${mention(sender)} ya enviaste tu respuesta en esta ronda.`,
        mentions: [sender]
      }, { quoted: msg });
    }

    const data = parseAnswer(body);

    game.answers.set(sender, data);

    if (!game.players.has(sender)) {
      game.players.set(sender, { total: 0, misses: 0 });
    }

    await sock.sendMessage(remoteJid, {
      text: `✅ ${mention(sender)} respuesta recibida.\n📌 El puntaje se mostrará al final.`,
      mentions: [sender]
    }, { quoted: msg });
  }
};
