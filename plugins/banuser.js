'use strict';

const config = require('../config');

function cleanJid(jid = '') {
  return String(jid).split(':')[0];
}

function cleanNumber(jid = '') {
  return String(jid)
    .split('@')[0]
    .split(':')[0]
    .replace(/\D/g, '');
}

function getMentioned(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
}

function getTarget(msg) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;

  if (quoted) return cleanJid(quoted);

  const mentioned = getMentioned(msg)[0];

  if (mentioned) return cleanJid(mentioned);

  return null;
}

function isOwnerNumber(jid = '') {
  const number = cleanNumber(jid);

  const owners = Array.isArray(config.owner)
    ? config.owner.map(n => String(n).replace(/\D/g, ''))
    : [];

  return owners.includes(number);
}

module.exports = {
  commands: ['banuser', 'unbanuser', 'banlist'],

  async execute(ctx) {
    const {
      sock,
      remoteJid,
      msg,
      sender,
      command,
      isOwner,
      db
    } = ctx;

    try {
      if (!isOwner) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Solo el owner puede usar este comando.'
        }, { quoted: msg });
      }

      if (command === 'banlist') {
        const data = await db.getAll();
        const users = data.users || {};

        const banned = Object.entries(users)
          .filter(([, user]) => user?.banned === true)
          .map(([jid]) => jid);

        if (!banned.length) {
          return sock.sendMessage(remoteJid, {
            text: '✅ No hay usuarios baneados.'
          }, { quoted: msg });
        }

        return sock.sendMessage(remoteJid, {
          text:
`🚫 *USUARIOS BANEADOS*

${banned.map((jid, i) => `${i + 1}. @${cleanNumber(jid)}`).join('\n')}`,
          mentions: banned
        }, { quoted: msg });
      }

      const target = getTarget(msg);

      if (!target) {
        return sock.sendMessage(remoteJid, {
          text:
`❌ Debes mencionar o responder a un usuario.

Ejemplos:
.banuser @usuario
.unbanuser @usuario
.banlist`
        }, { quoted: msg });
      }

      if (target === cleanJid(sender)) {
        return sock.sendMessage(remoteJid, {
          text: '❌ No puedes banearte a ti mismo.'
        }, { quoted: msg });
      }

      if (isOwnerNumber(target)) {
        return sock.sendMessage(remoteJid, {
          text: '❌ No puedes banear a un owner.'
        }, { quoted: msg });
      }

      if (command === 'banuser') {
        await db.banUser(target);

        return sock.sendMessage(remoteJid, {
          text:
`🚫 *USUARIO BANEADO*

👤 @${cleanNumber(target)}

Ya no podrá usar comandos del bot.`,
          mentions: [target]
        }, { quoted: msg });
      }

      if (command === 'unbanuser') {
        await db.unbanUser(target);

        return sock.sendMessage(remoteJid, {
          text:
`✅ *USUARIO DESBANEADO*

👤 @${cleanNumber(target)}

Ya puede volver a usar comandos del bot.`,
          mentions: [target]
        }, { quoted: msg });
      }

    } catch (err) {
      console.log('❌ Error en banuser:', err?.message || err);

      return sock.sendMessage(remoteJid, {
        text: '❌ Error usando banuser.'
      }, { quoted: msg });
    }
  }
};
