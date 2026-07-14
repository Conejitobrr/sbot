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

function isBotTarget(ctx, target = {}) {
  const botNum = number(ctx.botJid);
  if (!botNum) return false;
  const ids = [target.jid, ...(target.ids || [])];
  return ids.some(id => number(id) === botNum);
}

function isProtectedTarget(ctx, target = {}) {
  const ids = [target.jid, ...(target.ids || [])];
  const isOwner = ids.some(id => isOwnerUser(id));
  const isBot = isBotTarget(ctx, target);
  return isOwner || isBot;
}

function getProtectedReason(ctx, target = {}) {
  if (isBotTarget(ctx, target)) return 'bot';
  if ([target.jid, ...(target.ids || [])].some(id => isOwnerUser(id))) return 'owner';
  return 'protegido';
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
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(WARN_FILE)) fs.writeFileSync(WARN_FILE, JSON.stringify({}, null, 2));
    return JSON.parse(fs.readFileSync(WARN_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveWarns(data) {
  try { fs.writeFileSync(WARN_FILE, JSON.stringify(data, null, 2)); } catch {}
}

function getWarnCount(groupId, userJid) {
  const data = loadWarns();
  return Number(data?.[groupId]?.[userJid]?.count || 0);
}

function setWarnCount(groupId, userJid, count, reason = '') {
  const data = loadWarns();
  if (!data[groupId]) data[groupId] = {};
  if (!data[groupId][userJid]) data[groupId][userJid] = { count: 0, reasons: [] };

  data[groupId][userJid].count = Math.max(0, Number(count || 0));

  if (reason) {
    data[groupId][userJid].reasons.push({ reason, time: Date.now() });
  }

  if (data[groupId][userJid].count <= 0) delete data[groupId][userJid];
  saveWarns(data);
  return data?.[groupId]?.[userJid]?.count || 0;
}

function resetWarn(groupId, userJid) {
  const data = loadWarns();
  if (data[groupId]?.[userJid]) delete data[groupId][userJid];
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
    return ids.some(id => (id === clean || number(id) === num));
  }) || null;
}

function resolveTarget(rawJid = '', metadata = null) {
  const clean = cleanJid(rawJid);
  const num = number(clean);
  const participant = findParticipant(metadata, clean);

  if (participant) {
    const ids = [...getParticipantIds(participant), clean];
    if (num) ids.push(`${num}@s.whatsapp.net`);
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
  if (num) ids.push(`${num}@s.whatsapp.net`);
  const uniqueIds = [...new Set(ids.map(cleanJid).filter(Boolean))];

  return {
    jid: uniqueIds[0],
    ids: uniqueIds,
    label: num ? `@${num}` : '@usuario',
    number: num
  };
}

// 🔥 AQUÍ ESTÁ EL ARREGLO FINAL PARA LOS ADMINS 🔥
// Ahora lee la variable `isBotAdmin` y `isAdmin` directamente de tu handler
async function requireBotAdmin(ctx) {
  if (ctx.isBotAdmin) return true;

  await ctx.sock.sendMessage(ctx.remoteJid, {
    text: '❌ El bot necesita ser admin para hacer eso.'
  }, { quoted: ctx.msg });
  return false;
}

async function requireAdminOrOwner(ctx) {
  if (ctx.isOwner || ctx.isAdmin) return true;

  await ctx.sock.sendMessage(ctx.remoteJid, {
    text: '❌ Solo admins del grupo o el creador pueden usar este comando.'
  }, { quoted: ctx.msg });
  return false;
}

async function requireGroup(ctx) {
  if (ctx.fromGroup) return true;

  await ctx.sock.sendMessage(ctx.remoteJid, {
    text: '❌ Este comando solo funciona en grupos.'
  }, { quoted: ctx.msg });
  return false;
}

async function getTargets(ctx) {
  const { sock, remoteJid, msg, args, fromGroup, groupMetadata } = ctx;
  const metadata = fromGroup ? await getFreshMetadata(sock, remoteJid, groupMetadata) : null;
  const rawTargets = [];
  const mentioned = getMentionedJids(msg);
  const quoted = getQuotedParticipant(msg);

  if (quoted) rawTargets.push(quoted);
  for (const jid of mentioned) rawTargets.push(jid);

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
    if (!map.has(key)) map.set(key, target);
  }

  return [...map.values()];
}

function containsLink(text = '') {
  return /chat\.whatsapp\.com\/[a-zA-Z0-9]+/i.test(String(text || ''));
}

async function warnUser(sock, remoteJid, target, reason = '', msg = null) {
  const userJid = typeof target === 'string' ? cleanJid(target) : cleanJid(target.jid);
  const label = typeof target === 'string' ? `@${number(target)}` : target.label;
  const current = getWarnCount(remoteJid, userJid);
  const count = setWarnCount(remoteJid, userJid, current + 1, reason);

  await sock.sendMessage(remoteJid, {
    text: `⚠️ *Advertencia*\n\n👤 Usuario: ${label}\n📌 Motivo: ${reason || 'Sin motivo'}\n🚨 Warns: *${count}/${MAX_WARN}*`,
    mentions: [userJid]
  }, msg ? { quoted: msg } : {});

  return count;
}

async function groupUpdateTargets(sock, remoteJid, targets, action) {
  const primaryIds = targets.map(t => cleanJid(t.jid)).filter(Boolean);
  if (!primaryIds.length) throw new Error('Sin usuarios válidos.');

  try {
    await sock.groupParticipantsUpdate(remoteJid, primaryIds, action);
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
        } catch (err) { lastError = err; }
      }
      if (!done) failed.push(`${target.label}: ${lastError?.message || 'falló'}`);
    }
    if (failed.length) throw new Error(failed.join(' | '));
  }
}

async function sendSafe(sock, remoteJid, content, options = {}) {
  try {
    await sock.sendMessage(remoteJid, content, options);
  } catch {
    try {
      const fallbackText = content?.text ? String(content.text).replace(/@\S+/g, '@usuario') : '✅ Acción realizada.';
      await sock.sendMessage(remoteJid, { text: fallbackText }, options);
    } catch {}
  }
}

module.exports = {
  commands: [
    'kick', 'promote', 'demote', 'revoke', 'abrirgrupo', 'cerrargrupo',
    'warn', 'unwarn', 'warnings', 'warns', 'resetwarn', 'antilink'
  ],

  async onMessage(ctx) {
    const { sock, msg, remoteJid, body, fromGroup, isOwner, isAdmin, isBotAdmin } = ctx;
    const db = ctx.db || dbGlobal;

    try {
      const text = body || msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
      if (!fromGroup || !text) return;

      const enabled = await db.getGroupSetting(remoteJid, 'antilink');
      if (enabled !== true) return;
      if (!containsLink(text)) return;
      if (isOwner || isAdmin) return; 

      if (isBotAdmin) { 
        try { await sock.sendMessage(remoteJid, { delete: msg.key }); } catch {}
      }

      const metadata = await getFreshMetadata(sock, remoteJid, ctx.groupMetadata);
      const target = resolveTarget(ctx.sender, metadata);
      const count = await warnUser(sock, remoteJid, target, 'Enviar enlaces de otros grupos', msg);

      if (count >= MAX_WARN) {
        if (!isBotAdmin) {
          return sock.sendMessage(remoteJid, {
            text: `⚠️ ${target.label} llegó a *${MAX_WARN}/${MAX_WARN}* warns, pero no puedo expulsarlo porque no soy admin.`,
            mentions: [target.jid]
          });
        }

        if (isProtectedTarget(ctx, target)) {
          resetWarn(remoteJid, target.jid);
          return sock.sendMessage(remoteJid, {
            text: `🛡️ ${target.label} llegó a *${MAX_WARN}/${MAX_WARN}* warns, pero no puede ser expulsado porque es ${getProtectedReason(ctx, target)}.`,
            mentions: [target.jid]
          });
        }

        await groupUpdateTargets(sock, remoteJid, [target], 'remove');
        resetWarn(remoteJid, target.jid);

        return sock.sendMessage(remoteJid, {
          text: `🚫 Usuario expulsado por llegar a *${MAX_WARN}* advertencias.\n\n👤 ${target.label}`,
          mentions: [target.jid]
        });
      }
    } catch (err) {
      console.log('❌ Error en antilink:', err?.message || err);
    }
  },

  async execute(ctx) {
    const { sock, msg, remoteJid, args, command, db: ctxDb, groupMetadata } = ctx;
    const db = ctxDb || dbGlobal;
    const cmd = String(command || '').toLowerCase();

    try {
      if (!(await requireGroup(ctx))) return;

      if (cmd === 'antilink') {
        if (!(await requireAdminOrOwner(ctx))) return;

        const option = String(args?.[0] || '').toLowerCase();
        if (!option) {
          const enabled = await db.getGroupSetting(remoteJid, 'antilink');
          return sock.sendMessage(remoteJid, {
            text: `🛡️ *ANTILINK*\n\nEstado: *${enabled === true ? 'Activado ✅' : 'Desactivado ❌'}*\n\nUso:\n.antilink on\n.antilink off`
          }, { quoted: msg });
        }

        if (!['on', 'off'].includes(option)) {
          return sock.sendMessage(remoteJid, { text: '❌ Usa:\n.antilink on\n.antilink off' }, { quoted: msg });
        }

        await db.setGroupSetting(remoteJid, 'antilink', option === 'on');
        return sock.sendMessage(remoteJid, {
          text: option === 'on' ? '✅ Antilink activado.' : '✅ Antilink desactivado.'
        }, { quoted: msg });
      }

      if (!(await requireAdminOrOwner(ctx))) return;

      if (['kick', 'promote', 'demote', 'revoke', 'abrirgrupo', 'cerrargrupo'].includes(cmd)) {
        if (!(await requireBotAdmin(ctx))) return;
      }

      if (cmd === 'kick') {
        const targets = await getTargets(ctx);
        if (!targets.length) {
          return sock.sendMessage(remoteJid, { text: '❌ Responde, menciona o escribe el número.' }, { quoted: msg });
        }

        const protectedTargets = targets.filter(t => isProtectedTarget(ctx, t));
        const allowedTargets = targets.filter(t => !isProtectedTarget(ctx, t));

        if (protectedTargets.length) {
          await sendSafe(sock, remoteJid, {
            text: `🛡️ No puedo expulsar a:\n${protectedTargets.map(t => `• ${t.label} (${getProtectedReason(ctx, t)})`).join('\n')}`,
            mentions: protectedTargets.map(t => t.jid)
          }, { quoted: msg });
        }

        if (!allowedTargets.length) return;

        await groupUpdateTargets(sock, remoteJid, allowedTargets, 'remove');
        return sendSafe(sock, remoteJid, {
          text: `✅ Usuario(s) expulsado(s): ${allowedTargets.map(t => t.label).join(', ')}`,
          mentions: allowedTargets.map(t => t.jid)
        }, { quoted: msg });
      }

      if (cmd === 'promote') {
        const targets = await getTargets(ctx);
        if (!targets.length) {
          return sock.sendMessage(remoteJid, { text: '❌ Responde, menciona o escribe el número del usuario.' }, { quoted: msg });
        }
        await groupUpdateTargets(sock, remoteJid, targets, 'promote');
        return sendSafe(sock, remoteJid, {
          text: `✅ Admin otorgado a: ${targets.map(t => t.label).join(', ')}`,
          mentions: targets.map(t => t.jid)
        }, { quoted: msg });
      }

      if (cmd === 'demote') {
        const targets = await getTargets(ctx);
        if (!targets.length) {
          return sock.sendMessage(remoteJid, { text: '❌ Responde, menciona o escribe el número del usuario.' }, { quoted: msg });
        }
        await groupUpdateTargets(sock, remoteJid, targets, 'demote');
        return sendSafe(sock, remoteJid, {
          text: `✅ Admin removido a: ${targets.map(t => t.label).join(', ')}`,
          mentions: targets.map(t => t.jid)
        }, { quoted: msg });
      }

      if (cmd === 'revoke') {
        let code = '';
        try { code = await sock.groupRevokeInvite(remoteJid); } 
        catch { code = await sock.groupInviteCode(remoteJid); }
        return sock.sendMessage(remoteJid, { text: `✅ *Link del grupo reiniciado*\n\n🔗 Nuevo link:\nhttps://chat.whatsapp.com/${code}` }, { quoted: msg });
      }

      if (cmd === 'cerrargrupo') {
        await sock.groupSettingUpdate(remoteJid, 'announcement');
        return sock.sendMessage(remoteJid, { text: '🔒 Grupo cerrado. Solo admins pueden escribir.' }, { quoted: msg });
      }

      if (cmd === 'abrirgrupo') {
        await sock.groupSettingUpdate(remoteJid, 'not_announcement');
        return sock.sendMessage(remoteJid, { text: '🔓 Grupo abierto. Todos pueden escribir.' }, { quoted: msg });
      }

      if (cmd === 'warn') {
        const targets = await getTargets(ctx);
        if (!targets.length) return sock.sendMessage(remoteJid, { text: '❌ Responde, menciona o escribe el número.\nEjemplo: .warn @usuario spam' }, { quoted: msg });

        const reason = (args || []).filter(a => {
          const v = String(a || '').trim();
          if (!v || v.startsWith('@') || /^\+?\d{6,}$/.test(v.replace(/\s+/g, ''))) return false;
          return true;
        }).join(' ').trim();

        for (const target of targets) {
          const count = await warnUser(sock, remoteJid, target, reason || 'Advertencia manual', msg);

          if (count >= MAX_WARN) {
            if (isProtectedTarget(ctx, target)) {
              resetWarn(remoteJid, target.jid);
              await sendSafe(sock, remoteJid, { text: `🛡️ ${target.label} llegó a *${MAX_WARN}/${MAX_WARN}* warns, pero no puede ser expulsado porque es ${getProtectedReason(ctx, target)}.`, mentions: [target.jid] }, { quoted: msg });
              continue;
            }
            if (ctx.isBotAdmin) {
              await groupUpdateTargets(sock, remoteJid, [target], 'remove');
              resetWarn(remoteJid, target.jid);
              await sendSafe(sock, remoteJid, { text: `🚫 ${target.label} fue expulsado por llegar a *${MAX_WARN}* advertencias.`, mentions: [target.jid] }, { quoted: msg });
            } else {
              await sendSafe(sock, remoteJid, { text: `⚠️ ${target.label} llegó a *${MAX_WARN}/${MAX_WARN}* warns, pero no puedo expulsarlo porque no soy admin.`, mentions: [target.jid] }, { quoted: msg });
            }
          }
        }
        return;
      }

      if (cmd === 'unwarn') {
        const targets = await getTargets(ctx);
        if (!targets.length) return sock.sendMessage(remoteJid, { text: '❌ Responde, menciona o escribe el número del usuario.' }, { quoted: msg });
        for (const target of targets) {
          const current = getWarnCount(remoteJid, target.jid);
          setWarnCount(remoteJid, target.jid, Math.max(0, current - 1));
        }
        return sendSafe(sock, remoteJid, { text:
