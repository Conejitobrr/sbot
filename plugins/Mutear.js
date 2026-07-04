'use strict';

const fs = require('fs');
const path = require('path');

const MUTED_FILE = path.join(process.cwd(), 'lib', 'muted.json');

// ==========================================
// FUNCIONES DE CONTROL DE FORMATO E IDS
// ==========================================
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
  return cleanJid(jid).split('@')[0].replace(/\D/g, '');
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

function isAdminParticipant(participant = {}) {
  return (
    participant?.admin === 'admin' ||
    participant?.admin === 'superadmin' ||
    participant?.isAdmin === true
  );
}

// ==========================================
// CONSULTAS DE PERMISOS EN TIEMPO REAL
// ==========================================
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

    const botRaw = sock.user?.id || sock.user?.jid || sock.user?.lid || '';
    const botJid = cleanJid(botRaw);
    const botNum = number(botJid);

    const bot = metadata.participants.find(p => {
      const ids = getParticipantIds(p);
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

    const cleanUserJid = cleanJid(userJid);
    const userNum = number(cleanUserJid);

    const user = metadata.participants.find(p => {
      const ids = getParticipantIds(p);
      return ids.some(id => id === cleanUserJid || number(id) === userNum);
    });

    return isAdminParticipant(user);
  } catch {
    return false;
  }
}

function getTarget(msg) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
    if (quoted) return cleanJid(quoted);
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (mentioned) return cleanJid(mentioned);
    return null;
}

// ==========================================
// GESTIÓN DEL ARCHIVO DE SILENCIADOS (JSON)
// ==========================================
function loadMutes() {
  try {
    const dir = path.dirname(MUTED_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(MUTED_FILE)) fs.writeFileSync(MUTED_FILE, JSON.stringify({}, null, 2));
    return JSON.parse(fs.readFileSync(MUTED_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveMutes(data) {
  try {
    fs.writeFileSync(MUTED_FILE, JSON.stringify(data, null, 2));
  } catch {}
}

function isUserMuted(groupId, userJid) {
  const data = loadMutes();
  return !!data?.[groupId]?.[cleanJid(userJid)];
}

// ==========================================
// ESTRUCTURA PRINCIPAL DEL PLUGIN
// ==========================================
module.exports = {
  commands: ['mutear', 'unmutear', 'silenciar', 'desilenciar'],

  // 🔥 MONITOR AUTOMÁTICO: Borra mensajes de usuarios silenciados
  async onMessage(ctx) {
    const { sock, msg, remoteJid, sender, fromGroup, groupMetadata } = ctx;

    if (!fromGroup || !sender) return;

    const userJid = cleanJid(sender);

    // Si el usuario está en la lista negra de este grupo, procedemos
    if (isUserMuted(remoteJid, userJid)) {
      const botAdmin = await isBotAdmin(sock, remoteJid, groupMetadata);
      
      // Necesitamos ser admins en el grupo para borrar mensajes ajenos
      if (botAdmin) {
        try {
          await sock.sendMessage(remoteJid, { delete: msg.key });
        } catch (err) {
          console.log('❌ Error al intentar borrar mensaje de usuario muteado:', err);
        }
      }
    }
  },

  // 🛠️ EJECUCIÓN DE COMANDOS MANUALES
  async execute(ctx) {
    const { sock, remoteJid, msg, sender, args, command, fromGroup, isOwner, groupMetadata } = ctx;
    const cmd = String(command || '').toLowerCase();

    if (!fromGroup) {
      return sock.sendMessage(remoteJid, { text: '❌ Este comando solo se puede usar dentro de grupos.' }, { quoted: msg });
    }

    // 1. Verificar si quien usa el comando tiene permisos (Admin u Owner)
    let senderIsAdmin = false;
    try { senderIsAdmin = await isUserAdmin(sock, remoteJid, sender, groupMetadata); } catch (e) {}

    if (!senderIsAdmin && !isOwner) {
      return sock.sendMessage(remoteJid, { text: '❌ Solo los administradores del grupo o el owner pueden usar este comando.' }, { quoted: msg });
    }

    // 2. Resolver a quién se quiere mutear/unmutear
    let target = getTarget(msg);
    
    // Si no respondió ni mencionó, buscamos si escribió un número directo
    if (!target && args.length > 0) {
        const num = args.join('').replace(/\D/g, '');
        if (num.length >= 10) target = `${num}@s.whatsapp.net`;
    }

    if (!target) {
      return sock.sendMessage(remoteJid, { text: '❌ Debes responder a un mensaje, mencionar a alguien o escribir su número.\n\n*Ejemplo:*\n.mutear @usuario' }, { quoted: msg });
    }

    const targetJid = cleanJid(target);
    const targetNum = number(targetJid);
    const data = loadMutes();

    // ==========================================
    // ACCIÓN: MUTEAR / SILENCIAR
    // ==========================================
    if (cmd === 'mutear' || cmd === 'silenciar') {
      // Validar que el bot sea admin para que la funa/mute funcione
      const botAdmin = await isBotAdmin(sock, remoteJid, groupMetadata);
      if (!botAdmin) {
        return sock.sendMessage(remoteJid, { text: '❌ Necesito ser administrador del grupo para poder borrar los mensajes de los muteados.' }, { quoted: msg });
      }

      // Validar inmunidad del Bot
      const botRaw = sock.user?.id || sock.user?.jid || '';
      if (targetJid === cleanJid(botRaw)) {
        return sock.sendMessage(remoteJid, { text: '🛡️ No puedes mutearme a mí, causa. Soy el bot.' }, { quoted: msg });
      }

      // Validar inmunidad de los Administradores y del Owner
      let targetIsAdmin = false;
      try { targetIsAdmin = await isUserAdmin(sock, remoteJid, targetJid, groupMetadata); } catch (e) {}
      
      if (targetIsAdmin || targetNum === number(ctx.config?.owner) || targetNum === number(ctx.config?.rowner)) {
        return sock.sendMessage(remoteJid, { text: `🛡️ No se puede mutear a @${targetNum} porque cuenta con inmunidad (es Admin u Owner).`, mentions: [targetJid] }, { quoted: msg });
      }

      if (!data[remoteJid]) data[remoteJid] = {};
      
      if (data[remoteJid][targetJid]) {
        return sock.sendMessage(remoteJid, { text: `⚠️ @${targetNum} ya se encuentra silenciado en este chat.`, mentions: [targetJid] }, { quoted: msg });
      }

      // Registramos el muteo
      data[remoteJid][targetJid] = {
        mutedBy: cleanJid(sender),
        time: Date.now()
      };
      saveMutes(data);

      return sock.sendMessage(remoteJid, { 
        text: `🤐 *¡USUARIO SILENCIADO!* 🤐\n\nEl usuario @${targetNum} ha sido muteado en el grupo por mala conducta.\n\n_Cada mensaje que intente enviar será eliminado automáticamente de forma instantánea._ 🚷`, 
        mentions: [targetJid] 
      }, { quoted: msg });
    }

    // ==========================================
    // ACCIÓN: UNMUTEAR / DESILENCIAR
    // ==========================================
    if (cmd === 'unmutear' || cmd === 'desilenciar') {
      if (!data[remoteJid] || !data[remoteJid][targetJid]) {
        return sock.sendMessage(remoteJid, { text: `⚠️ @${targetNum} no está silenciado en este grupo.`, mentions: [targetJid] }, { quoted: msg });
      }

      // Lo removemos del registro
      delete data[remoteJid][targetJid];
      if (Object.keys(data[remoteJid]).length === 0) delete data[remoteJid];
      saveMutes(data);

      return sock.sendMessage(remoteJid, { text: `🔊 @${targetNum} ha sido desilenciado. Ya puede volver a escribir normalmente en el grupo.`, mentions: [targetJid] }, { quoted: msg });
    }
  }
};
