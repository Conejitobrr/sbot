'use strict';

const fs = require('fs');
const path = require('path');

const MEMORY_PATH = path.join(process.cwd(), 'lib', 'clon_memory.json');
const MAX_MESSAGES = 120;

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

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
  return String(text).replace(/\s+/g, ' ').trim();
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

function removeTargetFromQuestion(args = []) {
  return args
    .join(' ')
    .replace(/@\d+/g, '')
    .replace(/\d{5,}/g, '')
    .trim();
}

function getStyleStats(messages = []) {
  const joined = messages.join(' ');

  const emojis = joined.match(/[\u{1F300}-\u{1FAFF}]/gu) || [];
  const laughs = joined.match(/(jaja+|JAJA+|xd|XD|jsjs+|JSJS+|ksks+)/g) || [];

  const shortSamples = messages
    .filter(m => m.length <= 120)
    .slice(-25);

  return {
    emojis: [...new Set(emojis)].slice(-10),
    laughs: [...new Set(laughs)].slice(-8),
    samples: shortSamples
  };
}

async function askGroq({ targetName, question, samples, emojis, laughs }) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('Falta GROQ_API_KEY en .env');
  }

  const prompt = `
Eres un generador de respuestas estilo chat de WhatsApp.

Debes responder como si imitaras el estilo de escritura de una persona del grupo, usando sus frases, emojis, risas y tono.

IMPORTANTE:
- No digas que eres una IA.
- No expliques nada.
- No uses comillas.
- No digas "simulación".
- Responde corto, natural y como chat real.
- Puedes usar humor, burla o tono picante si encaja con los ejemplos.
- No repitas exactamente una frase antigua salvo que tenga sentido.
- Responde coherentemente a la pregunta.

Persona a imitar: ${targetName}

Pregunta o contexto:
${question}

Mensajes reales recientes de esa persona:
${samples.map(x => `- ${x}`).join('\n') || '- Sin suficientes mensajes aún'}

Emojis frecuentes:
${emojis.join(' ') || 'ninguno'}

Risas frecuentes:
${laughs.join(', ') || 'ninguna'}

Genera SOLO la respuesta.
`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.9,
      max_tokens: 90,
      messages: [
        {
          role: 'system',
          content: 'Responde como un usuario de WhatsApp imitado por estilo. Sé breve, natural y directo.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error?.message || 'Error llamando Groq');
  }

  return cleanText(data.choices?.[0]?.message?.content || '');
}

function fallbackReply(question, samples = []) {
  const base = samples.length
    ? samples[Math.floor(Math.random() * samples.length)]
    : 'no sé pe jaja';

  if (question.includes('?')) {
    return `mmm ${base}`;
  }

  return base;
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

Ejemplo:
.clon @usuario qué opinas de mí?`
      }, { quoted: msg });
    }

    const question = removeTargetFromQuestion(args) || 'responde algo como tú responderías';

    const memory = loadMemory();
    const messages = memory[target]?.messages || [];
    const stats = getStyleStats(messages);

    const targetName = mention(target);

    let answer;

    try {
      answer = await askGroq({
        targetName,
        question,
        samples: stats.samples,
        emojis: stats.emojis,
        laughs: stats.laughs
      });
    } catch (e) {
      console.log('❌ Error Groq clon:', e?.message || e);
      answer = fallbackReply(question, stats.samples);
    }

    await sock.sendMessage(remoteJid, {
      text:
`🎭 *Clon de ${targetName}:*

${answer}`,
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
    if (text.length > 220) return;
    if (/https?:\/\//i.test(text)) return;

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
