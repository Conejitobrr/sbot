'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config');

const COUNTER_FILE = path.join(process.cwd(), 'lib', 'messageCounter.json');

function ensureFile() {
  const dir = path.dirname(COUNTER_FILE);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(COUNTER_FILE)) {
    fs.writeFileSync(COUNTER_FILE, JSON.stringify({}, null, 2));
  }
}

function loadData() {
  try {
    ensureFile();
    return JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveData(data) {
  try {
    ensureFile();
    fs.writeFileSync(COUNTER_FILE, JSON.stringify(data, null, 2));
  } catch {}
}

function cleanJid(jid = '') {
  const value = String(jid || '');

  if (!value) return '';

  if (value.includes('@')) {
    const [user, server] = value.split('@');
    return `${user.split(':')[0]}@${server}`;
  }

  return value.split(':')[0];
}

function number(jid = '') {
  return cleanJid(jid)
    .split('@')[0]
    .replace(/\D/g, '');
}

function cleanName(name = '') {
  return String(name || '')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
}

function isOwnerUser(jid = '') {
  const num = number(jid);

  const owners = Array.isArray(config.owner)
    ? config.owner.map(n => String(n).replace(/\D/g, ''))
    : [];

  const rowners = Array.isArray(config.rowner)
    ? config.rowner.map(n => String(n).replace(/\D/g, ''))
    : [];

  return owners.includes(num) || rowners.includes(num);
}

function unwrapMessage(message = {}) {
  if (message.ephemeralMessage?.message) {
    return unwrapMessage(message.ephemeralMessage.message);
  }

  if (message.viewOnceMessage?.message) {
    return unwrapMessage(message.viewOnceMessage.message);
  }

  if (message.viewOnceMessageV2?.message) {
    return unwrapMessage(message.viewOnceMessageV2.message);
  }

  if (message.documentWithCaptionMessage?.message) {
    return unwrapMessage(message.documentWithCaptionMessage.message);
  }

  return message;
}

function getMessageType(message = {}) {
  const m = unwrapMessage(message);

  if (m.conversation || m.extendedTextMessage) return 'text';
  if (m.imageMessage) return 'image';
  if (m.videoMessage) return 'video';

  if (m.audioMessage) {
    return m.audioMessage.ptt ? 'ptt' : 'audio';
  }

  if (m.stickerMessage) return 'sticker';
  if (m.documentMessage) return 'document';
  if (m.contactMessage || m.contactsArrayMessage) return 'contact';
  if (m.locationMessage || m.liveLocationMessage) return 'location';
  if (m.pollCreationMessage || m.pollCreationMessageV2 || m.pollCreationMessageV3) return 'poll';

  return 'other';
}

function getContextInfo(msg = {}) {
  return (
    msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.imageMessage?.contextInfo ||
    msg.message?.videoMessage?.contextInfo ||
    msg.message?.audioMessage?.contextInfo ||
    msg.message?.documentMessage?.contextInfo ||
    msg.message?.stickerMessage?.contextInfo ||
    null
  );
}

function getMentionedJids(msg = {}) {
  const ctx = getContextInfo(msg);

  return Array.isArray(ctx?.mentionedJid)
    ? ctx.mentionedJid.map(cleanJid).filter(Boolean)
    : [];
}

function getQuotedParticipant(msg = {}) {
  const ctx = getContextInfo(msg);
  return cleanJid(ctx?.participant || '');
}

function jidFromNumber(text = '') {
  const num = String(text || '').replace(/\D/g, '');

  if (!num || num.length < 6) return '';

  return `${num}@s.whatsapp.net`;
}

function getTargetJid(msg, args, sender) {
  const quoted = getQuotedParticipant(msg);
  if (quoted) return quoted;

  const mentions = getMentionedJids(msg);
  if (mentions.length) return mentions[0];

  for (const arg of args || []) {
    const jid = jidFromNumber(arg);
    if (jid) return jid;
  }

  return sender ? cleanJid(sender) : '';
}

function emptyStats() {
  return {
    total: 0,
    text: 0,
    image: 0,
    video: 0,
    sticker: 0,
    audio: 0,
    ptt: 0,
    document: 0,
    contact: 0,
    location: 0,
    poll: 0,
    other: 0,
    lastMessage: 0
  };
}

function addMessage(remoteJid, sender, type) {
  const data = loadData();

  const groupId = cleanJid(remoteJid);
  const userId = cleanJid(sender);

  if (!groupId || !userId) return;

  if (!data[groupId]) data[groupId] = {};
  if (!data[groupId][userId]) data[groupId][userId] = emptyStats();

  const stats = data[groupId][userId];

  stats.total = Number(stats.total || 0) + 1;
  stats[type] = Number(stats[type] || 0) + 1;
  stats.lastMessage = Date.now();

  saveData(data);
}

function getStats(remoteJid, userJid) {
  const data = loadData();

  const groupId = cleanJid(remoteJid);
  const userId = cleanJid(userJid);

  return data?.[groupId]?.[userId] || emptyStats();
}

function getGroupStats(remoteJid) {
  const data = loadData();
  return data?.[cleanJid(remoteJid)] || {};
}

function resetGroupStats(remoteJid) {
  const data = loadData();
  delete data[cleanJid(remoteJid)];
  saveData(data);
}

function resetUserStats(remoteJid, userJid) {
  const data = loadData();

  const groupId = cleanJid(remoteJid);
  const userId = cleanJid(userJid);

  if (data[groupId]?.[userId]) {
    delete data[groupId][userId];
  }

  saveData(data);
}

async function getFreshMetadata(sock, remoteJid, groupMetadata) {
  try {
    const metadata = await sock.groupMetadata(remoteJid);

    if (metadata?.participants?.length) {
      return metadata;
    }
  } catch {}

  return groupMetadata || null;
}

function getParticipantIds(participant = {}) {
  return [
    participant.id,
    participant.jid,
    participant.participant,
    participant.lid
  ]
    .filter(Boolean)
    .map(cleanJid)
    .filter(Boolean);
}

function findParticipant(metadata, jid = '') {
  if (!metadata?.participants?.length) return null;

  const clean = cleanJid(jid);
  const num = number(clean);

  return metadata.participants.find(p => {
    const ids = getParticipantIds(p);

    return ids.some(id => {
      return id === clean || number(id) === num;
    });
  }) || null;
}

function getDisplayName(metadata, jid = '') {
  const participant = findParticipant(metadata, jid);

  const name = cleanName(
    participant?.name ||
    participant?.notify ||
    participant?.verifiedName ||
    participant?.pushName ||
    ''
  );

  if (name) return `@${name}`;

  return `@${number(jid)}`;
}

function formatStats(userJid, stats, metadata = null) {
  const lines = [];

  const categories = [
    ['text', '💬 Texto'],
    ['image', '🖼️ Fotos'],
    ['video', '🎥 Videos'],
    ['sticker', '🗿 Stickers'],
    ['audio', '🎧 Audios'],
    ['ptt', '🎙️ Notas de voz'],
    ['document', '📄 Documentos'],
    ['contact', '👤 Contactos'],
    ['location', '📍 Ubicaciones'],
    ['poll', '📊 Encuestas'],
    ['other', '📦 Otros']
  ];

  for (const [key, label] of categories) {
    const value = Number(stats[key] || 0);

    if (value > 0) {
      lines.push(`${label}: ${value}`);
    }
  }

  const userLabel = metadata
    ? getDisplayName(metadata, userJid)
    : `@${number(userJid)}`;

  if (!Number(stats.total || 0)) {
    return `📊 *CONTADOR DE MENSAJES*

👤 Usuario: ${userLabel}

📨 *Total:* 0 msjs

Este usuario todavía no tiene mensajes contados.`;
  }

  return `📊 *CONTADOR DE MENSAJES*

👤 Usuario: ${userLabel}

📨 *Total:* ${stats.total} msjs

${lines.join('\n')}`;
}

function formatAllGroupStats(remoteJid, metadata = null) {
  const groupStats = getGroupStats(remoteJid);

  const entries = Object.entries(groupStats)
    .filter(([, stats]) => Number(stats?.total || 0) > 0)
    .sort((a, b) => Number(b[1].total || 0) - Number(a[1].total || 0));

  if (!entries.length) {
    return {
      text: '📊 Todavía no hay mensajes contados en este grupo.',
      mentions: []
    };
  }

  const mentions = entries.map(([jid]) => jid);

  const list = entries
    .map(([jid, stats], i) => {
      const label = metadata
        ? getDisplayName(metadata, jid)
        : `@${number(jid)}`;

      return `${i + 1}. ${label} — Total ${stats.total} msjs`;
    })
    .join('\n');

  return {
    text:
`📊 *MENSAJES DE TODOS LOS PARTICIPANTES*

${list}`,
    mentions
  };
}

module.exports = {
  commands: [
    'mensajes',
    'contador',
    'msg',
    'todosmensajes',
    'msggrupo',
    'topmensajes',
    'topmsg',
    'resetcontador'
  ],

  async onMessage(ctx) {
    const {
      msg,
      remoteJid,
      sender,
      fromGroup
    } = ctx;

    try {
      if (!fromGroup) return;
      if (!msg?.message) return;
      if (msg.key?.fromMe) return;

      const message = unwrapMessage(msg.message);

      if (message.protocolMessage) return;
      if (message.senderKeyDistributionMessage) return;

      const type = getMessageType(message);

      addMessage(remoteJid, sender, type);

    } catch (err) {
      console.log('❌ Error contador mensajes:', err?.message || err);
    }
  },

  async execute(ctx) {
    const {
      sock,
      msg,
      remoteJid,
      sender,
      args,
      command,
      fromGroup,
      isAdmin,
      isOwner,
      groupMetadata
    } = ctx;

    const cmd = String(command || '').toLowerCase();

    try {
      if (!fromGroup) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Este comando solo funciona en grupos.'
        }, { quoted: msg });
      }

      const metadata = await getFreshMetadata(sock, remoteJid, groupMetadata);

      if (
        cmd === 'todosmensajes' ||
        cmd === 'msggrupo' ||
        cmd === 'topmensajes' ||
        cmd === 'topmsg'
      ) {
        const all = formatAllGroupStats(remoteJid, metadata);

        return sock.sendMessage(remoteJid, {
          text: all.text,
          mentions: all.mentions
        }, { quoted: msg });
      }

      if (cmd === 'resetcontador') {
        const owner = isOwner === true || isOwnerUser(sender);

        if (!owner && !isAdmin) {
          return sock.sendMessage(remoteJid, {
            text: '❌ Solo admins del grupo o owner pueden reiniciar el contador.'
          }, { quoted: msg });
        }

        const target = getTargetJid(msg, args, '');

        if (target) {
          resetUserStats(remoteJid, target);

          return sock.sendMessage(remoteJid, {
            text: `✅ Contador reiniciado para @${number(target)}.`,
            mentions: [target]
          }, { quoted: msg });
        }

        resetGroupStats(remoteJid);

        return sock.sendMessage(remoteJid, {
          text: '✅ Contador de mensajes del grupo reiniciado.'
        }, { quoted: msg });
      }

      const target = getTargetJid(msg, args, sender);
      const stats = getStats(remoteJid, target);

      return sock.sendMessage(remoteJid, {
        text: formatStats(target, stats, metadata),
        mentions: [target]
      }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error comando contador:', err?.message || err);

      return sock.sendMessage(remoteJid, {
        text: '❌ Ocurrió un error mostrando el contador.'
      }, { quoted: msg });
    }
  }
};
