'use strict';

const fs = require('fs');
const path = require('path');
const db = require('../lib/database');

const MEMORY_PATH = path.join(process.cwd(), 'lib', 'chat_memory.json');
const DB_PATH = path.join(process.cwd(), 'lib', 'global_settings.json');

const MAX_HISTORY = 12;
const MAX_USER_MEMORY = 25;

function ensureMemory() {
  const dir = path.dirname(MEMORY_PATH);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(MEMORY_PATH)) {
    fs.writeFileSync(MEMORY_PATH, JSON.stringify({}, null, 2));
  }
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

async function isChatbotEnabled() {
  try {
    if (typeof db.getGlobalSetting === 'function') {
      return await db.getGlobalSetting('chatbot') === true;
    }

    if (typeof db.getSetting === 'function') {
      return await db.getSetting('chatbot') === true;
    }

    if (fs.existsSync(DB_PATH)) {
      const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8') || '{}');

      return (
        data?.global?.chatbot === true ||
        data?.settings?.chatbot === true ||
        data?.globalSettings?.chatbot === true
      );
    }

    return false;
  } catch {
    return false;
  }
}

function getTextFromMsg(msg) {
  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    ''
  );
}

function cleanCommand(text = '') {
  return text.replace(/^[.!/#]?(ai|bot|ia)\s*/i, '').trim();
}

function isCommand(text = '') {
  return /^[.!/#]/.test(String(text).trim());
}

function mentionName(pushName = '', sender = '') {
  if (pushName) return pushName;

  return sender
    .split('@')[0]
    .replace(/\D/g, '') || 'Usuario';
}

function getUserProfile(memory, sender, pushName) {
  if (!memory.users) {
    memory.users = {};
  }

  if (!memory.users[sender]) {
    memory.users[sender] = {
      name: mentionName(pushName, sender),
      messages: [],
      relationship: 'neutral'
    };
  }

  return memory.users[sender];
}

function analyzeRelationship(text = '') {
  const t = text.toLowerCase();

  if (/(te amo|love|hermoso|bonito|💖|😍|🥺)/i.test(t)) {
    return 'friendly';
  }

  if (/(feo|idiota|callate|cállate|tonto|estupido|estúpido)/i.test(t)) {
    return 'chaotic';
  }

  return 'neutral';
}

function localReply(text = '') {
  const t = text.toLowerCase();

  if (/(hola|buenas|hey|ola)/i.test(t)) {
    return 'Holaa 😹 ¿qué haces?';
  }

  if (/(como estas|cómo estás)/i.test(t)) {
    return 'Todo tranqui 😎 ¿y tú?';
  }

  if (/(quien eres|quién eres)/i.test(t)) {
    return 'Soy SiriusBot 😼';
  }

  if (/(gracias|thanks)/i.test(t)) {
    return 'De nada pe 😹';
  }

  return 'Mmm interesante 😹';
}

async function askGroq({
  text,
  sender,
  pushName,
  relationship,
  recentMessages,
  chatHistory
}) {
  if (!process.env.GROQ_API_KEY) {
    return null;
  }

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 25000);

  try {
    const systemPrompt = `
Eres SiriusBot.

Un bot de WhatsApp peruano,
divertido,
natural,
algo troll,
sociable,
con humor,
usas emojis naturalmente.

IMPORTANTE:
- NO hablas formal.
- NO dices que eres IA.
- Respondes como alguien real del grupo.
- Recuerdas cómo te habla cada usuario.
- Tratas diferente a cada persona.
- Si te preguntan algo informativo, responde más detallado y útil.
- Si es broma, responde relajado.
- No hagas respuestas gigantes innecesarias.

Relación con este usuario:
${relationship}

Mensajes recientes del usuario:
${recentMessages.join('\n') || 'Sin historial'}

Contexto reciente del chat:
${chatHistory.join('\n') || 'Sin contexto'}
`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        temperature: 0.95,
        max_tokens: 450,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `${pushName}: ${text}`
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.log('❌ GROQ ERROR:', data);
      return null;
    }

    return data?.choices?.[0]?.message?.content?.trim() || null;

  } catch (err) {
    console.log('❌ IA ERROR:', err?.message || err);
    return null;

  } finally {
    clearTimeout(timeout);
  }
}

async function runChatbot(ctx, rawText) {
  const {
    sock,
    msg,
    remoteJid,
    sender,
    pushName
  } = ctx;

  const text = String(rawText || '').trim();

  if (!text) return;

  const memory = loadMemory();

  if (!memory.chats) {
    memory.chats = {};
  }

  if (!memory.chats[remoteJid]) {
    memory.chats[remoteJid] = [];
  }

  const profile = getUserProfile(memory, sender, pushName);

  profile.relationship = analyzeRelationship(text);
  profile.messages.push(text);

  if (profile.messages.length > MAX_USER_MEMORY) {
    profile.messages = profile.messages.slice(-MAX_USER_MEMORY);
  }

  memory.chats[remoteJid].push(
    `${mentionName(pushName, sender)}: ${text}`
  );

  if (memory.chats[remoteJid].length > MAX_HISTORY) {
    memory.chats[remoteJid] =
      memory.chats[remoteJid].slice(-MAX_HISTORY);
  }

  saveMemory(memory);

  try {
    await sock.sendPresenceUpdate('composing', remoteJid);

    const aiReply = await askGroq({
      text,
      sender,
      pushName: mentionName(pushName, sender),
      relationship: profile.relationship,
      recentMessages: profile.messages.slice(-10),
      chatHistory: memory.chats[remoteJid].slice(-10)
    });

    const reply = aiReply || localReply(text);

    return sock.sendMessage(remoteJid, {
      text: reply
    }, { quoted: msg });

  } catch {
    return sock.sendMessage(remoteJid, {
      text: localReply(text)
    }, { quoted: msg });
  }
}

module.exports = {
  commands: ['ai', 'bot', 'ia'],

  async onMessage(ctx) {
    const {
      msg,
      body,
      fromMe
    } = ctx;

    if (fromMe) return;

    const enabled = await isChatbotEnabled();
    if (!enabled) return;

    const text = body || getTextFromMsg(msg);
    if (!text) return;

    // Evita responder comandos como .menu, .play, .spotify, etc.
    if (isCommand(text)) return;

    return runChatbot(ctx, text);
  },

  async execute(ctx) {
    const {
      sock,
      msg,
      remoteJid,
      args
    } = ctx;

    let text = args?.join(' ')?.trim();

    if (!text) {
      text = cleanCommand(getTextFromMsg(msg));
    }

    if (!text) {
      return sock.sendMessage(remoteJid, {
        text:
`🤖 Habla conmigo 😹

Ejemplos:
.ai hola
.ai quién eres
.ai explícame qué es un agujero negro`
      }, { quoted: msg });
    }

    return runChatbot(ctx, text);
  }
};
