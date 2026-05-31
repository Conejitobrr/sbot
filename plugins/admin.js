'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config');
const dbGlobal = require('../lib/database');

const WARN_FILE = path.join(process.cwd(), 'lib', 'warnings.json');
const MAX_WARN = 3;

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

function isAdminParticipant(participant = {}) {
  return (
    participant?.admin === 'admin' ||
    participant?.admin === 'superadmin' ||
    participant?.isAdmin === true
  );
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

function loadWarns() {
  try {
    if (!fs.existsSync(WARN_FILE)) {
      fs.writeFileSync(WARN_FILE, JSON.stringify({}, null, 2));
    }

    return JSON.parse(fs.readFileSync(WARN_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveWarns(data) {
  try {
    fs.writeFileSync(WARN_FILE, JSON.stringify(data, null, 2));
  } catch {}
}

function getWarnCount(groupId, userJid) {
  const data = loadWarns();
  return Number(data?.[groupId]?.[userJid]?.count || 0);
}

function setWarnCount(groupId, userJid, count, reason = '') {
  const data = loadWarns();

  if (!data[groupId]) data[groupId] = {};
  if (!data[groupId][userJid]) {
    data[groupId][userJid] = {
      count: 0,
      reasons: []
    };
  }

  data[groupId][userJid].count = Math.max(0, Number(count || 0));

  if (reason) {
    data[groupId][userJid].reasons.push({
      reason,
      time: Date.now()
    });
  }

  if (data[groupId][userJid].count <= 0) {
    delete data[groupId][userJid];
  }

  saveWarns(data);

  return data?.[groupId]?.[userJid]?.count || 0;
}

function resetWarn(groupId, userJid) {
  const data = loadWarns();

  if (data[groupId]?.[userJid]) {
    delete data[groupId][userJid];
  }

  saveWarns(data);
}

function getGroupWarns(groupId) {
  const data = loadWarns();
  return data[groupId] || {};
}

async function getFreshMetadata(sock, remoteJid, groupMetadata) {
  try {
    const metadata = await sock.groupMetadata(remoteJid);
    if (metadata?.participants?.length) return metadata;
  } catch {}

  return groupMetadata || null;
}

async function isBotAdmin(sock, remoteJid, groupMetadata) {
  try {
    const metadata = await getFreshMetadata(sock, remoteJid, groupMetadata);
    if (!metadata?.participants?.length) return false;

    const botRaw =
      sock.user?.id ||
      sock.user?.jid ||
      sock.user?.lid ||
      '';

    const botJid = cleanJid(botRaw);
    const botNum = number(botJid);

    const bot = metadata.participants.find(p => {
      const ids = [
        p.id,
        p.jid,
        p.participant,
        p.lid
      ]
        .filter(Boolean)
        .map(cleanJid);

      return ids.some(id => id === botJid || number(id) === botNum);
    });

    return isAdminParticipant(bot);
  } catch {
    return false;
  }
}

async function isUserAdmin(sock, remoteJid, userJid, groupMetadata) {
  try {
    const metadata = await getFreshMetadata(sock, remoteJid, groupMetadata);
    if (!metadata?.participants?.length) return false;

    const cleanUser = cleanJid(userJid);
    const userNum = number(cleanUser);

    const user = metadata.participants.find(p => {
      const ids = [
        p.id,
        p.jid,
        p.participant,
        p.lid
      ]
        .filter(Boolean)
        .map(cleanJid);

      return ids.some(id => id === cleanUser || number(id) === userNum);
    });

    return isAdminParticipant(user);
  } catch {
    return false;
  }
}

async function requireGroup(sock, remoteJid, msg, fromGroup) {
  if (fromGroup) return true;

  await sock.sendMessage(remoteJid, {
    text: '❌ Este comando solo funciona en grupos.'
  }, { quoted: msg });

  return false;
}

async function requireAdminOrOwner(ctx) {
  const {
    sock,
    msg,
    remoteJid,
    sender,
    fromGroup,
    isAdmin,
    isOwner,
    groupMetadata
  } = ctx;

  const owner = isOwner === true || isOwnerUser(sender);

  if (owner) return true;

  let admin = isAdmin === true;

  if (fromGroup && !admin) {
    admin = await isUserAdmin(sock, remoteJid, sender, groupMetadata);
  }

  if (admin) return true;

  await sock.sendMessage(remoteJid, {
    text: '❌ Solo admins del grupo o owner pueden usar este comando.'
  }, { quoted: msg });

  return false;
}

async function requireBotAdmin(ctx) {
  const {
    sock,
    msg,
    remoteJid,
    groupMetadata
  } = ctx;

  const botAdmin = await isBotAdmin(sock, remoteJid, groupMetadata);

  if (botAdmin) return true;

  await sock.sendMessage(remoteJid, {
    text: '❌ El bot necesita ser admin para hacer eso.'
  }, { quoted: msg });

  return false;
}

function getTargets(msg, args = []) {
  const targets = [];

  const quoted = getQuotedParticipant(msg);
  if (quoted) targets.push(quoted);

  const mentions = getMentionedJids(msg);
  for (const jid of mentions) targets.push(jid);

  for (const arg of args) {
    const jid = jidFromNumber(arg);
    if (jid) targets.push(jid);
  }

  return [...new Set(targets.map(cleanJid).filter(Boolean))];
}

function containsLink(text = '') {
  const value = String(text || '');

  return (
    /https?:\/\/\S+/i.test(value) ||
    /chat\.whatsapp\.com\/[A-Za-z0-9]+/i.test(value) ||
    /(?:www\.)?[a-z0-9-]+\.[a-z]{2,}(?:\/\S*)?/i.test(value)
  );
}

async function warnUser(sock, remoteJid, userJid, reason = '', msg = null) {
  const current = getWarnCount(remoteJid, userJid);
  const count = setWarnCount(remoteJid, userJid, current + 1, reason);

  await sock.sendMessage(remoteJid, {
    text:
`⚠️ *Advertencia*

👤 Usuario: @${number(userJid)}
📌 Motivo: ${reason || 'Sin motivo'}
🚨 Warns: *${count}/${MAX_WARN}*`,
    mentions: [userJid]
  }, msg ? { quoted: msg } : {});

  return count;
}

async function kickUsers(sock, remoteJid, targets) {
  const valid = targets.map(cleanJid).filter(Boolean);

  if (!valid.length) {
    throw new Error('Sin usuarios para expulsar.');
  }

  await sock.groupParticipantsUpdate(remoteJid, valid, 'remove');
}

module.exports = {
  commands: [
    'kick',
    'promote',
    'demote',
    'revoke',
    'group',
    'grupo',
    'warn',
    'unwarn',
    'warnings',
    'warns',
    'resetwarn',
    'antilink'
  ],

  async onMessage(ctx) {
    const {
      sock,
      msg,
      remoteJid,
      sender,
      body,
      fromGroup,
      isOwner,
      isAdmin,
      groupMetadata
    } = ctx;

    const db = ctx.db || dbGlobal;

    try {
      if (!fromGroup || !body) return;

      const enabled = await db.getGroupSetting(remoteJid, 'antilink');
      if (enabled !== true) return;

      if (!containsLink(body)) return;

      const owner = isOwner === true || isOwnerUser(sender);

      let senderIsAdmin = isAdmin === true;

      if (!senderIsAdmin) {
        senderIsAdmin = await isUserAdmin(sock, remoteJid, sender, groupMetadata);
      }

      if (owner || senderIsAdmin) return;

      const botAdmin = await isBotAdmin(sock, remoteJid, groupMetadata);

      if (botAdmin) {
        try {
          await sock.sendMessage(remoteJid, {
            delete: msg.key
          });
        } catch {}
      }

      const count = await warnUser(
        sock,
        remoteJid,
        cleanJid(sender),
        'Enviar links con antilink activado',
        msg
      );

      if (count >= MAX_WARN) {
        if (!botAdmin) {
          return sock.sendMessage(remoteJid, {
            text:
`⚠️ @${number(sender)} llegó a *${MAX_WARN}/${MAX_WARN}* warns, pero no puedo expulsarlo porque no soy admin.`,
            mentions: [cleanJid(sender)]
          });
        }

        await kickUsers(sock, remoteJid, [sender]);
        resetWarn(remoteJid, cleanJid(sender));

        return sock.sendMessage(remoteJid, {
          text:
`🚫 Usuario expulsado por llegar a *${MAX_WARN}* advertencias.

👤 @${number(sender)}`,
          mentions: [cleanJid(sender)]
        });
      }

    } catch (err) {
      console.log('❌ Error en antilink:', err?.message || err);
    }
  },

  async execute(ctx) {
    const {
      sock,
      msg,
      remoteJid,
      args,
      command,
      fromGroup,
      db: ctxDb,
      groupMetadata
    } = ctx;

    const db = ctxDb || dbGlobal;
    const cmd = String(command || '').toLowerCase();

    try {
      if (!(await requireGroup(sock, remoteJid, msg, fromGroup))) return;

      if (cmd === 'antilink') {
        if (!(await requireAdminOrOwner(ctx))) return;

        const option = String(args?.[0] || '').toLowerCase();

        if (!option) {
          const enabled = await db.getGroupSetting(remoteJid, 'antilink');

          return sock.sendMessage(remoteJid, {
            text:
`🛡️ *ANTILINK*

Estado: *${enabled === true ? 'Activado ✅' : 'Desactivado ❌'}*

Uso:
.antilink on
.antilink off`
          }, { quoted: msg });
        }

        if (!['on', 'off'].includes(option)) {
          return sock.sendMessage(remoteJid, {
            text: '❌ Usa:\n.antilink on\n.antilink off'
          }, { quoted: msg });
        }

        await db.setGroupSetting(remoteJid, 'antilink', option === 'on');

        return sock.sendMessage(remoteJid, {
          text: option === 'on'
            ? '✅ Antilink activado.'
            : '✅ Antilink desactivado.'
        }, { quoted: msg });
      }

      if (!(await requireAdminOrOwner(ctx))) return;

      if (['kick', 'promote', 'demote', 'revoke', 'group', 'grupo'].includes(cmd)) {
        if (!(await requireBotAdmin(ctx))) return;
      }

      if (cmd === 'kick') {
        const targets = getTargets(msg, args);

        if (!targets.length) {
          return sock.sendMessage(remoteJid, {
            text:
`❌ Responde, menciona o escribe el número.

Ejemplos:
.kick @usuario
.kick 51999999999`
          }, { quoted: msg });
        }

        await kickUsers(sock, remoteJid, targets);

        return sock.sendMessage(remoteJid, {
          text: `✅ Usuario(s) expulsado(s): ${targets.map(j => `@${number(j)}`).join(', ')}`,
          mentions: targets
        }, { quoted: msg });
      }

      if (cmd === 'promote') {
        const targets = getTargets(msg, args);

        if (!targets.length) {
          return sock.sendMessage(remoteJid, {
            text: '❌ Responde, menciona o escribe el número del usuario.'
          }, { quoted: msg });
        }

        await sock.groupParticipantsUpdate(remoteJid, targets, 'promote');

        return sock.sendMessage(remoteJid, {
          text: `✅ Admin otorgado a: ${targets.map(j => `@${number(j)}`).join(', ')}`,
          mentions: targets
        }, { quoted: msg });
      }

      if (cmd === 'demote') {
        const targets = getTargets(msg, args);

        if (!targets.length) {
          return sock.sendMessage(remoteJid, {
            text: '❌ Responde, menciona o escribe el número del usuario.'
          }, { quoted: msg });
        }

        await sock.groupParticipantsUpdate(remoteJid, targets, 'demote');

        return sock.sendMessage(remoteJid, {
          text: `✅ Admin removido a: ${targets.map(j => `@${number(j)}`).join(', ')}`,
          mentions: targets
        }, { quoted: msg });
      }

      if (cmd === 'revoke') {
        let code = '';

        try {
          code = await sock.groupRevokeInvite(remoteJid);
        } catch {
          code = await sock.groupInviteCode(remoteJid);
        }

        const link = `https://chat.whatsapp.com/${code}`;

        return sock.sendMessage(remoteJid, {
          text:
`✅ *Link del grupo reiniciado*

🔗 Nuevo link:
${link}`
        }, { quoted: msg });
      }

      if (cmd === 'group' || cmd === 'grupo') {
        const option = String(args?.[0] || '').toLowerCase();

        if (!['abrir', 'cerrar', 'open', 'close'].includes(option)) {
          return sock.sendMessage(remoteJid, {
            text:
`❌ Usa:

.group abrir
.group cerrar`
          }, { quoted: msg });
        }

        if (['cerrar', 'close'].includes(option)) {
          await sock.groupSettingUpdate(remoteJid, 'announcement');

          return sock.sendMessage(remoteJid, {
            text: '🔒 Grupo cerrado. Solo admins pueden escribir.'
          }, { quoted: msg });
        }

        await sock.groupSettingUpdate(remoteJid, 'not_announcement');

        return sock.sendMessage(remoteJid, {
          text: '🔓 Grupo abierto. Todos pueden escribir.'
        }, { quoted: msg });
      }

      if (cmd === 'warn') {
        const targets = getTargets(msg, args);

        if (!targets.length) {
          return sock.sendMessage(remoteJid, {
            text:
`❌ Responde, menciona o escribe el número.

Ejemplo:
.warn @usuario spam`
          }, { quoted: msg });
        }

        const reason = args
          .filter(a => !a.includes('@') && !/^\+?\d+$/.test(a))
          .join(' ')
          .trim();

        const botAdmin = await isBotAdmin(sock, remoteJid, groupMetadata);

        for (const target of targets) {
          const count = await warnUser(
            sock,
            remoteJid,
            target,
            reason || 'Advertencia manual',
            msg
          );

          if (count >= MAX_WARN) {
            if (botAdmin) {
              await kickUsers(sock, remoteJid, [target]);
              resetWarn(remoteJid, target);

              await sock.sendMessage(remoteJid, {
                text:
`🚫 @${number(target)} fue expulsado por llegar a *${MAX_WARN}* advertencias.`,
                mentions: [target]
              }, { quoted: msg });
            } else {
              await sock.sendMessage(remoteJid, {
                text:
`⚠️ @${number(target)} llegó a *${MAX_WARN}/${MAX_WARN}* warns, pero no puedo expulsarlo porque no soy admin.`,
                mentions: [target]
              }, { quoted: msg });
            }
          }
        }

        return;
      }

      if (cmd === 'unwarn') {
        const targets = getTargets(msg, args);

        if (!targets.length) {
          return sock.sendMessage(remoteJid, {
            text: '❌ Responde, menciona o escribe el número del usuario.'
          }, { quoted: msg });
        }

        for (const target of targets) {
          const current = getWarnCount(remoteJid, target);
          setWarnCount(remoteJid, target, Math.max(0, current - 1));
        }

        return sock.sendMessage(remoteJid, {
          text: `✅ Se quitó 1 warn a: ${targets.map(j => `@${number(j)}`).join(', ')}`,
          mentions: targets
        }, { quoted: msg });
      }

      if (cmd === 'resetwarn') {
        const targets = getTargets(msg, args);

        if (!targets.length) {
          return sock.sendMessage(remoteJid, {
            text: '❌ Responde, menciona o escribe el número del usuario.'
          }, { quoted: msg });
        }

        for (const target of targets) {
          resetWarn(remoteJid, target);
        }

        return sock.sendMessage(remoteJid, {
          text: `✅ Warns reiniciados para: ${targets.map(j => `@${number(j)}`).join(', ')}`,
          mentions: targets
        }, { quoted: msg });
      }

      if (cmd === 'warnings' || cmd === 'warns') {
        const warns = getGroupWarns(remoteJid);
        const entries = Object.entries(warns)
          .filter(([, data]) => Number(data?.count || 0) > 0)
          .sort((a, b) => Number(b[1].count || 0) - Number(a[1].count || 0));

        if (!entries.length) {
          return sock.sendMessage(remoteJid, {
            text: '✅ No hay usuarios con advertencias en este grupo.'
          }, { quoted: msg });
        }

        const mentions = entries.map(([jid]) => jid);

        const list = entries
          .map(([jid, data], i) => `${i + 1}. @${number(jid)} — *${data.count}/${MAX_WARN}*`)
          .join('\n');

        return sock.sendMessage(remoteJid, {
          text:
`⚠️ *WARNINGS DEL GRUPO*

${list}`,
          mentions
        }, { quoted: msg });
      }

    } catch (err) {
      console.log(`❌ Error en comando admin (${cmd}):`, err?.message || err);

      return sock.sendMessage(remoteJid, {
        text: '❌ Ocurrió un error ejecutando el comando.'
      }, { quoted: msg });
    }
  }
};
