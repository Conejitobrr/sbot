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

function getBotNumber(sock) {
  const botRaw =
    sock.user?.id ||
    sock.user?.jid ||
    sock.user?.lid ||
    '';

  return number(botRaw);
}

function isBotTarget(sock, target = {}) {
  const botNum = getBotNumber(sock);

  if (!botNum) return false;

  const ids = [
    target.jid,
    ...(target.ids || [])
  ];

  return ids.some(id => number(id) === botNum);
}

function isProtectedTarget(sock, target = {}) {
  const ids = [
    target.jid,
    ...(target.ids || [])
  ];

  const isOwner = ids.some(id => isOwnerUser(id));
  const isBot = isBotTarget(sock, target);

  return isOwner || isBot;
}

function getProtectedReason(sock, target = {}) {
  if (isBotTarget(sock, target)) return 'bot';
  if ([target.jid, ...(target.ids || [])].some(id => isOwnerUser(id))) return 'owner';
  return 'protegido';
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

function getBodyFromMsg(msg = {}) {
  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    msg.message?.documentMessage?.caption ||
    ''
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

function getParticipantLabel(participant = {}, fallbackJid = '') {
  const name = cleanName(
    participant.name ||
    participant.notify ||
    participant.verifiedName ||
    participant.pushName ||
    ''
  );

  if (name) return `@${name}`;

  const num = number(fallbackJid);
  return num ? `@${num}` : '@usuario';
}

function loadWarns() {
  try {
    const dir = path.dirname(WARN_FILE);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

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

function findParticipant(metadata, jid = '') {
  if (!metadata?.participants?.length) return null;

  const clean = cleanJid(jid);
  const num = number(clean);

  return metadata.participants.find(p => {
    const ids = getParticipantIds(p);

    return ids.some(id => {
      return (
        id === clean ||
        number(id) === num
      );
    });
  }) || null;
}

function resolveTarget(rawJid = '', metadata = null) {
  const clean = cleanJid(rawJid);
  const num = number(clean);

  const participant = findParticipant(metadata, clean);

  if (participant) {
    const ids = [
      ...getParticipantIds(participant),
      clean
    ];

    if (num) {
      ids.push(`${num}@s.whatsapp.net`);
    }

    const uniqueIds = [...new Set(ids.map(cleanJid).filter(Boolean))];
    const jid = uniqueIds[0];

    return {
      jid,
      ids: uniqueIds,
      label: getParticipantLabel(participant, jid),
      number: number(jid)
    };
  }

  const ids = [clean];

  if (num) {
    ids.push(`${num}@s.whatsapp.net`);
  }

  const uniqueIds = [...new Set(ids.map(cleanJid).filter(Boolean))];

  return {
    jid: uniqueIds[0],
    ids: uniqueIds,
    label: num ? `@${num}` : '@usuario',
    number: num
  };
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
      const ids = getParticipantIds(p);

      return ids.some(id => {
        return (
          id === botJid ||
          number(id) === botNum
        );
      });
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

    const user = findParticipant(metadata, userJid);
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

async function getTargets(ctx) {
  const {
    sock,
    remoteJid,
    msg,
    args,
    fromGroup,
    groupMetadata
  } = ctx;

  const metadata = fromGroup
    ? await getFreshMetadata(sock, remoteJid, groupMetadata)
    : null;

  const rawTargets = [];
  const mentioned = getMentionedJids(msg);
  const quoted = getQuotedParticipant(msg);

  if (quoted) {
    rawTargets.push(quoted);
  }

  for (const jid of mentioned) {
    rawTargets.push(jid);
  }

  for (const arg of args || []) {
    const value = String(arg || '').trim();
    if (!value) continue;

    if (value.startsWith('@') && mentioned.length > 0) continue;

    const jid = jidFromNumber(value);
    if (jid) rawTargets.push(jid);
  }

  const map = new Map();

  for (const raw of rawTargets) {
    const target = resolveTarget(raw, metadata);

    if (!target?.jid) continue;

    const key = target.number || target.jid;

    if (!map.has(key)) {
      map.set(key, target);
    }
  }

  return [...map.values()];
}

function containsLink(text = '') {
  const value = String(text || '');

  return (
    /https?:\/\/\S+/i.test(value) ||
    /chat\.whatsapp\.com\/[A-Za-z0-9]+/i.test(value) ||
    /(?:www\.)?[a-z0-9-]+\.[a-z]{2,}(?:\/\S*)?/i.test(value)
  );
}

async function warnUser(sock, remoteJid, target, reason = '', msg = null) {
  const userJid = typeof target === 'string'
    ? cleanJid(target)
    : cleanJid(target.jid);

  const label = typeof target === 'string'
    ? `@${number(target)}`
    : target.label;

  const current = getWarnCount(remoteJid, userJid);
  const count = setWarnCount(remoteJid, userJid, current + 1, reason);

  await sock.sendMessage(remoteJid, {
    text:
`⚠️ *Advertencia*

👤 Usuario: ${label}
📌 Motivo: ${reason || 'Sin motivo'}
🚨 Warns: *${count}/${MAX_WARN}*`,
    mentions: [userJid]
  }, msg ? { quoted: msg } : {});

  return count;
}

async function groupUpdateTargets(sock, remoteJid, targets, action) {
  const primaryIds = targets
    .map(t => cleanJid(t.jid))
    .filter(Boolean);

  if (!primaryIds.length) {
    throw new Error('Sin usuarios válidos.');
  }

  try {
    await sock.groupParticipantsUpdate(remoteJid, primaryIds, action);
    return;
  } catch (firstErr) {
    const failed = [];

    for (const target of targets) {
      let done = false;
      let lastError = firstErr;

      for (const id of target.ids || []) {
        try {
          await sock.groupParticipantsUpdate(remoteJid, [cleanJid(id)], action);
          done = true;
          break;
        } catch (err) {
          lastError = err;
        }
      }

      if (!done) {
        failed.push(`${target.label}: ${lastError?.message || 'falló'}`);
      }
    }

    if (failed.length) {
      throw new Error(failed.join(' | '));
    }
  }
}

async function sendSafe(sock, remoteJid, content, options = {}) {
  try {
    await sock.sendMessage(remoteJid, content, options);
  } catch {
    try {
      const fallbackText = content?.text
        ? String(content.text).replace(/@\S+/g, '@usuario')
        : '✅ Acción realizada.';

      await sock.sendMessage(remoteJid, {
        text: fallbackText
      }, options);
    } catch {}
  }
}

module.exports = {
  commands: [
    'kick',
    'promote',
    'demote',
    'revoke',
    'abrirgrupo',
    'cerrargrupo',
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
      const text = body || getBodyFromMsg(msg);

      if (!fromGroup || !text) return;

      const enabled = await db.getGroupSetting(remoteJid, 'antilink');
      if (enabled !== true) return;

      if (!containsLink(text)) return;

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

      const metadata = await getFreshMetadata(sock, remoteJid, groupMetadata);
      const target = resolveTarget(sender, metadata);

      const count = await warnUser(
        sock,
        remoteJid,
        target,
        'Enviar links con antilink activado',
        msg
      );

      if (count >= MAX_WARN) {
        if (!botAdmin) {
          return sock.sendMessage(remoteJid, {
            text:
`⚠️ ${target.label} llegó a *${MAX_WARN}/${MAX_WARN}* warns, pero no puedo expulsarlo porque no soy admin.`,
            mentions: [target.jid]
          });
        }

        if (isProtectedTarget(sock, target)) {
          resetWarn(remoteJid, target.jid);

          return sock.sendMessage(remoteJid, {
            text:
`🛡️ ${target.label} llegó a *${MAX_WARN}/${MAX_WARN}* warns, pero no puede ser expulsado porque es ${getProtectedReason(sock, target)}.`,
            mentions: [target.jid]
          });
        }

        await groupUpdateTargets(sock, remoteJid, [target], 'remove');
        resetWarn(remoteJid, target.jid);

        return sock.sendMessage(remoteJid, {
          text:
`🚫 Usuario expulsado por llegar a *${MAX_WARN}* advertencias.

👤 ${target.label}`,
          mentions: [target.jid]
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

      if (['kick', 'promote', 'demote', 'revoke', 'abrirgrupo', 'cerrargrupo'].includes(cmd)) {
        if (!(await requireBotAdmin(ctx))) return;
      }

      if (cmd === 'kick') {
        const targets = await getTargets(ctx);

        if (!targets.length) {
          return sock.sendMessage(remoteJid, {
            text:
`❌ Responde, menciona o escribe el número.

Ejemplos:
.kick @usuario
.kick 51999999999`
          }, { quoted: msg });
        }

        const protectedTargets = targets.filter(t => isProtectedTarget(sock, t));
        const allowedTargets = targets.filter(t => !isProtectedTarget(sock, t));

        if (protectedTargets.length) {
          await sendSafe(sock, remoteJid, {
            text:
`🛡️ No puedo expulsar a:
${protectedTargets.map(t => `• ${t.label} (${getProtectedReason(sock, t)})`).join('\n')}`,
            mentions: protectedTargets.map(t => t.jid)
          }, { quoted: msg });
        }

        if (!allowedTargets.length) return;

        await groupUpdateTargets(sock, remoteJid, allowedTargets, 'remove');

        await sendSafe(sock, remoteJid, {
          text: `✅ Usuario(s) expulsado(s): ${allowedTargets.map(t => t.label).join(', ')}`,
          mentions: allowedTargets.map(t => t.jid)
        }, { quoted: msg });

        return;
      }

      if (cmd === 'promote') {
        const targets = await getTargets(ctx);

        if (!targets.length) {
          return sock.sendMessage(remoteJid, {
            text: '❌ Responde, menciona o escribe el número del usuario.'
          }, { quoted: msg });
        }

        await groupUpdateTargets(sock, remoteJid, targets, 'promote');

        await sendSafe(sock, remoteJid, {
          text: `✅ Admin otorgado a: ${targets.map(t => t.label).join(', ')}`,
          mentions: targets.map(t => t.jid)
        }, { quoted: msg });

        return;
      }

      if (cmd === 'demote') {
        const targets = await getTargets(ctx);

        if (!targets.length) {
          return sock.sendMessage(remoteJid, {
            text: '❌ Responde, menciona o escribe el número del usuario.'
          }, { quoted: msg });
        }

        await groupUpdateTargets(sock, remoteJid, targets, 'demote');

        await sendSafe(sock, remoteJid, {
          text: `✅ Admin removido a: ${targets.map(t => t.label).join(', ')}`,
          mentions: targets.map(t => t.jid)
        }, { quoted: msg });

        return;
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

      if (cmd === 'cerrargrupo') {
        await sock.groupSettingUpdate(remoteJid, 'announcement');

        return sock.sendMessage(remoteJid, {
          text: '🔒 Grupo cerrado. Solo admins pueden escribir.'
        }, { quoted: msg });
      }

      if (cmd === 'abrirgrupo') {
        await sock.groupSettingUpdate(remoteJid, 'not_announcement');

        return sock.sendMessage(remoteJid, {
          text: '🔓 Grupo abierto. Todos pueden escribir.'
        }, { quoted: msg });
      }

      if (cmd === 'warn') {
        const targets = await getTargets(ctx);

        if (!targets.length) {
          return sock.sendMessage(remoteJid, {
            text:
`❌ Responde, menciona o escribe el número.

Ejemplo:
.warn @usuario spam`
          }, { quoted: msg });
        }

        const reason = (args || [])
          .filter(a => {
            const value = String(a || '').trim();
            if (!value) return false;
            if (value.startsWith('@')) return false;
            if (/^\+?\d{6,}$/.test(value.replace(/\s+/g, ''))) return false;
            return true;
          })
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
            if (isProtectedTarget(sock, target)) {
              resetWarn(remoteJid, target.jid);

              await sendSafe(sock, remoteJid, {
                text:
`🛡️ ${target.label} llegó a *${MAX_WARN}/${MAX_WARN}* warns, pero no puede ser expulsado porque es ${getProtectedReason(sock, target)}.`,
                mentions: [target.jid]
              }, { quoted: msg });

              continue;
            }

            if (botAdmin) {
              await groupUpdateTargets(sock, remoteJid, [target], 'remove');
              resetWarn(remoteJid, target.jid);

              await sendSafe(sock, remoteJid, {
                text:
`🚫 ${target.label} fue expulsado por llegar a *${MAX_WARN}* advertencias.`,
                mentions: [target.jid]
              }, { quoted: msg });
            } else {
              await sendSafe(sock, remoteJid, {
                text:
`⚠️ ${target.label} llegó a *${MAX_WARN}/${MAX_WARN}* warns, pero no puedo expulsarlo porque no soy admin.`,
                mentions: [target.jid]
              }, { quoted: msg });
            }
          }
        }

        return;
      }

      if (cmd === 'unwarn') {
        const targets = await getTargets(ctx);

        if (!targets.length) {
          return sock.sendMessage(remoteJid, {
            text: '❌ Responde, menciona o escribe el número del usuario.'
          }, { quoted: msg });
        }

        for (const target of targets) {
          const current = getWarnCount(remoteJid, target.jid);
          setWarnCount(remoteJid, target.jid, Math.max(0, current - 1));
        }

        return sendSafe(sock, remoteJid, {
          text: `✅ Se quitó 1 warn a: ${targets.map(t => t.label).join(', ')}`,
          mentions: targets.map(t => t.jid)
        }, { quoted: msg });
      }

      if (cmd === 'resetwarn') {
        const targets = await getTargets(ctx);

        if (!targets.length) {
          return sock.sendMessage(remoteJid, {
            text: '❌ Responde, menciona o escribe el número del usuario.'
          }, { quoted: msg });
        }

        for (const target of targets) {
          resetWarn(remoteJid, target.jid);
        }

        return sendSafe(sock, remoteJid, {
          text: `✅ Warns reiniciados para: ${targets.map(t => t.label).join(', ')}`,
          mentions: targets.map(t => t.jid)
        }, { quoted: msg });
      }

      if (cmd === 'warnings' || cmd === 'warns') {
        const metadata = await getFreshMetadata(sock, remoteJid, groupMetadata);
        const warns = getGroupWarns(remoteJid);

        const entries = Object.entries(warns)
          .filter(([, data]) => Number(data?.count || 0) > 0)
          .sort((a, b) => Number(b[1].count || 0) - Number(a[1].count || 0));

        if (!entries.length) {
          return sock.sendMessage(remoteJid, {
            text: '✅ No hay usuarios con advertencias en este grupo.'
          }, { quoted: msg });
        }

        const targets = entries.map(([jid]) => resolveTarget(jid, metadata));
        const mentions = targets.map(t => t.jid);

        const list = entries
          .map(([jid, data], i) => {
            const target = resolveTarget(jid, metadata);
            return `${i + 1}. ${target.label} — *${data.count}/${MAX_WARN}*`;
          })
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
