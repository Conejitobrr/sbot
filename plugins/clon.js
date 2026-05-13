'use strict';

const fs = require('fs');
const path = require('path');

const MEMORY_PATH = path.join(process.cwd(), 'lib', 'clon_memory.json');
const MAX_MESSAGES = 80;

function ensureMemory() {
  const dir = path.dirname(MEMORY_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(MEMORY_PATH)) fs.writeFileSync(MEMORY_PATH, '{}');
}

function loadMemory() {
  ensureMemory();
  try {
    return JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf8') || '{}');
  } catch {
    return {};
  }
}

function saveMemory(data) {
  ensureMemory();
  fs.writeFileSync(MEMORY_PATH, JSON.stringify(data, null, 2));
}

function cleanText(text = '') {
  return String(text)
    .replace(/\s+/g, ' ')
    .trim();
}

function mention(jid = '') {
  return '@' + jid.split('@')[0];
}

function getTarget(msg, args) {
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (mentioned) return mentioned;

  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quoted) return quoted;

  if (args[0]) {
    const clean = args[0].replace(/\D/g, '');
    if (clean) return clean + '@s.whatsapp.net';
  }

  return null;
}

function getStyle(messages = []) {
  const joined = messages.join(' ');
  const emojis = joined.match(/[\u{1F300}-\u{1FAFF}]/gu) || [];
  const laughs = joined.match(/(jaja+|JAJA+|xd|XD|jsjs+|ksks+)/g) || [];

  const commonWords = joined
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .split(/\s+/)
    .filter(w => w.length >= 3)
    .slice(-25);

  return {
    emojis: emojis.slice(-8),
    laughs: laughs.slice(-5),
    words: commonWords
  };
}

function makeReply(targetName, question, samples = []) {
  const style = getStyle(samples);

  const bases = [
    'ni cagando',
    'sí pe',
    'no sé causa',
    'obvio que sí',
    'qué hablas oe',
    'jajaja ya empezaste',
    'anda duerme mejor',
    'eso está bien raro',
    'yo digo que sí',
    'yo digo que no',
    'cállate oe',
    'qué fue mano',
    'no molestes',
    'literalmente sí',
    'me llega pero ya'
  ];

  let base = samples.length
    ? samples[Math.floor(Math.random() * samples.length)]
    : bases[Math.floor(Math.random() * bases.length)];

  base = cleanText(base);

  if (base.length > 120) {
    base = base.slice(0, 120).trim();
  }

  const laugh = style.laughs.length
    ? style.laughs[Math.floor(Math.random() * style.laughs.length)]
    : Math.random() < 0.5 ? 'jaja' : '';

  const emoji = style.emojis.length
    ? style.emojis[Math.floor(Math.random() * style.emojis.length)]
    : Math.random() < 0.4 ? '😹' : '';

  const extra = [
    `sobre eso de "${question}", ${base}`,
    `${base}`,
    `${question}? ${base}`,
    `yo diría que ${base}`,
    `mmm ${base}`,
    `oe ${base}`
  ];

  let reply = extra[Math.floor(Math.random() * extra.length)];

  if (laugh && Math.random() < 0.7) reply += ` ${laugh}`;
  if (emoji && Math.random() < 0.7) reply += ` ${emoji}`;

  return `🎭 *Clon de ${targetName}:*\n\n"${reply}"`;
}

module.exports = {
  commands: ['clon', 'clone'],

  async execute(ctx) {
    const { sock, msg, remoteJid, args } = ctx;

    const target = getTarget(msg, args);

    if (!target) {
      return sock.sendMessage(remoteJid, {
        text:
`❌ Uso:

.clon @usuario pregunta
.clon @usuario qué opinas de mí?

También puedes responder a alguien con:
.clon pregunta`
      }, { quoted: msg });
    }

    let question = args.join(' ').trim();

    question = question
      .replace(/@\d+/g, '')
      .replace(/\d{5,}/g, '')
      .trim();

    if (!question) {
      question = 'qué responderías';
    }

    const memory = loadMemory();
    const samples = memory[target]?.messages || [];

    const targetName = mention(target);

    const response = makeReply(targetName, question, samples);

    await sock.sendMessage(remoteJid, {
      text: response,
      mentions: [target]
    }, { quoted: msg });
  },

  async onMessage(ctx) {
    const { body, sender } = ctx;

    if (!body || !sender) return;

    const text = cleanText(body);

    if (!text) return;
    if (text.startsWith('.')) return;
    if (text.length < 3) return;
    if (text.length > 180) return;

    const memory = loadMemory();

    if (!memory[sender]) {
      memory[sender] = {
        messages: []
      };
    }

    memory[sender].messages.push(text);

    if (memory[sender].messages.length > MAX_MESSAGES) {
      memory[sender].messages = memory[sender].messages.slice(-MAX_MESSAGES);
    }

    saveMemory(memory);
  }
};
