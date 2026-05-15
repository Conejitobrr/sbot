'use strict';

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'lib', 'marriages.json');
const PROPOSALS = new Map();

function ensureDB() {
  const dir = path.dirname(DB_PATH);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({
      marriages: {}
    }, null, 2));
  }
}

function loadDB() {
  ensureDB();

  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8') || '{}');
  } catch {
    return { marriages: {} };
  }
}

function saveDB(data) {
  ensureDB();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function cleanJid(jid = '') {
  return String(jid).split(':')[0];
}

function number(jid = '') {
  return cleanJid(jid).split('@')[0].replace(/\D/g, '');
}

function getMentioned(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
}

function getPartner(data, user) {
  const clean = cleanJid(user);
  return data.marriages?.[clean]?.partner || null;
}

function isMarried(data, user) {
  return !!getPartner(data, user);
}

function formatDate(ms) {
  const d = new Date(ms);
  return d.toLocaleDateString('es-PE');
}

module.exports = {
  commands: ['proponer', 'aceptar', 'rechazar', 'divorcio', 'pareja', 'matrimonio'],

  async execute({ sock, msg, remoteJid, sender, command }) {
    const data = loadDB();

    sender = cleanJid(sender);

    if (command === 'matrimonio') {
      return sock.sendMessage(remoteJid, {
        text:
`💍 *Sistema de matrimonio*

➤ *.proponer @usuario* → Proponer matrimonio
➤ *.aceptar* → Aceptar propuesta
➤ *.rechazar* → Rechazar propuesta
➤ *.pareja* → Ver tu pareja
➤ *.divorcio* → Divorciarte`
      }, { quoted: msg });
    }

    if (command === 'proponer') {
      const mentioned = getMentioned(msg)[0];

      if (!mentioned) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Debes mencionar a alguien.\n\nEjemplo:\n.proponer @usuario'
        }, { quoted: msg });
      }

      const target = cleanJid(mentioned);

      if (target === sender) {
        return sock.sendMessage(remoteJid, {
          text: '❌ No puedes casarte contigo mismo 😹'
        }, { quoted: msg });
      }

      if (isMarried(data, sender)) {
        return sock.sendMessage(remoteJid, {
          text: '💍 Ya estás casado/a. Primero usa *.divorcio*.'
        }, { quoted: msg });
      }

      if (isMarried(data, target)) {
        return sock.sendMessage(remoteJid, {
          text: '💔 Esa persona ya está casada.'
        }, { quoted: msg });
      }

      PROPOSALS.set(target, {
        from: sender,
        to: target,
        chat: remoteJid,
        time: Date.now()
      });

      return sock.sendMessage(remoteJid, {
        text:
`💍 *@${number(sender)}* le propuso matrimonio a *@${number(target)}*

@${number(target)}, responde con:
✅ *.aceptar*
❌ *.rechazar*`,
        mentions: [sender, target]
      }, { quoted: msg });
    }

    if (command === 'aceptar') {
      const proposal = PROPOSALS.get(sender);

      if (!proposal || proposal.chat !== remoteJid) {
        return sock.sendMessage(remoteJid, {
          text: '❌ No tienes ninguna propuesta pendiente.'
        }, { quoted: msg });
      }

      if (isMarried(data, sender) || isMarried(data, proposal.from)) {
        PROPOSALS.delete(sender);

        return sock.sendMessage(remoteJid, {
          text: '❌ La propuesta ya no es válida porque alguien ya está casado.'
        }, { quoted: msg });
      }

      data.marriages[sender] = {
        partner: proposal.from,
        since: Date.now()
      };

      data.marriages[proposal.from] = {
        partner: sender,
        since: Date.now()
      };

      saveDB(data);
      PROPOSALS.delete(sender);

      return sock.sendMessage(remoteJid, {
        text:
`💍✨ *¡MATRIMONIO CONFIRMADO!*

@${number(proposal.from)} y @${number(sender)} ahora están casados 😻

Que viva el amor... o el chisme 😹`,
        mentions: [proposal.from, sender]
      }, { quoted: msg });
    }

    if (command === 'rechazar') {
      const proposal = PROPOSALS.get(sender);

      if (!proposal || proposal.chat !== remoteJid) {
        return sock.sendMessage(remoteJid, {
          text: '❌ No tienes ninguna propuesta pendiente.'
        }, { quoted: msg });
      }

      PROPOSALS.delete(sender);

      return sock.sendMessage(remoteJid, {
        text:
`💔 *@${number(sender)}* rechazó la propuesta de *@${number(proposal.from)}* 😿`,
        mentions: [sender, proposal.from]
      }, { quoted: msg });
    }

    if (command === 'pareja') {
      const partner = getPartner(data, sender);

      if (!partner) {
        return sock.sendMessage(remoteJid, {
          text: '💔 No estás casado/a con nadie.'
        }, { quoted: msg });
      }

      const since = data.marriages[sender]?.since;

      return sock.sendMessage(remoteJid, {
        text:
`💍 *Tu pareja actual*

👤 @${number(sender)}
❤️ @${number(partner)}
📅 Desde: ${formatDate(since)}`,
        mentions: [sender, partner]
      }, { quoted: msg });
    }

    if (command === 'divorcio') {
      const partner = getPartner(data, sender);

      if (!partner) {
        return sock.sendMessage(remoteJid, {
          text: '❌ No estás casado/a.'
        }, { quoted: msg });
      }

      delete data.marriages[sender];
      delete data.marriages[partner];

      saveDB(data);

      return sock.sendMessage(remoteJid, {
        text:
`💔 *DIVORCIO CONFIRMADO*

@${number(sender)} y @${number(partner)} ya no están casados.

Se acabó el amor 😿`,
        mentions: [sender, partner]
      }, { quoted: msg });
    }
  }
};
