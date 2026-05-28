'use strict';

const db = require('../lib/database');

function cleanJid(jid = '') {
  return String(jid).split(':')[0];
}

function number(jid = '') {
  return cleanJid(jid)
    .split('@')[0]
    .replace(/\D/g, '');
}

function getMentioned(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
}

function fixTextMentions(text = '', mentioned = []) {
  let result = String(text || '');

  for (const jid of mentioned) {
    const num = number(jid);

    if (!num) continue;

    result = result.replace(/@\S+/, `@${num}`);
  }

  return result;
}

module.exports = {
  commands: ['top'],

  async execute(ctx) {
    const { sock, remoteJid, msg, args, sender } = ctx;

    const mentioned = getMentioned(msg).map(cleanJid);

    let text = args.join(' ').trim();

    if (mentioned.length) {
      text = fixTextMentions(text, mentioned);
    }

    if (!text) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Ejemplo:\n.top guapos'
      }, { quoted: msg });
    }

    // 🔥 OBTENER PARTICIPANTES
    let metadata;
    try {
      metadata = await sock.groupMetadata(remoteJid);
    } catch {
      return sock.sendMessage(remoteJid, {
        text: '❌ Este comando solo funciona en grupos'
      }, { quoted: msg });
    }

    let participants = metadata.participants.map(v => cleanJid(v.id));

    // 🔥 EVITAR ERRORES SI HAY MENOS DE 10
    if (participants.length < 2) {
      return sock.sendMessage(remoteJid, {
        text: '❌ No hay suficientes usuarios en el grupo'
      }, { quoted: msg });
    }

    // 🔥 SHUFFLE (MEZCLAR ARRAY)
    for (let i = participants.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [participants[i], participants[j]] = [participants[j], participants[i]];
    }

    // 🔥 TOMAR SOLO 10 SIN REPETIR
    const top10 = participants.slice(0, 10);

    const emojiList = ['🤓','😅','😂','😳','😎','🥵','😱','🤑','🙄','💩','🍑','🤨','🥴','🔥','👇🏻','😔','👀','🌚'];
    const emoji = emojiList[Math.floor(Math.random() * emojiList.length)];

    const tag = (u) => '@' + number(u);

    let textTop = `*${emoji} TOP 10 ${text.toUpperCase()} ${emoji}*\n\n`;

    top10.forEach((user, i) => {
      const pos = ['🥇','🥈','🥉'][i] || `${i + 1}.`;
      textTop += `${pos} ${tag(user)}\n`;
    });

    const mentions = [
      ...new Set([
        ...top10,
        ...mentioned
      ])
    ];

    // 🔥 ENVIAR
    await sock.sendMessage(remoteJid, {
      text: textTop,
      mentions
    }, { quoted: msg });

    // ⭐ XP silencioso por usar el comando: 20 - 50 XP
    try {
      const xp = Math.floor(Math.random() * 31) + 20;
      await db.addXP(sender, xp);
    } catch {}
  }
};
