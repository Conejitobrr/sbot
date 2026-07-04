'use strict';

// ==========================================
// LÓGICA ROBUSTA (EXTRAÍDA DE TU PLUGIN FUNCIONAL)
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

function isAdminParticipant(participant = {}) {
  return (
    participant?.admin === 'admin' ||
    participant?.admin === 'superadmin' ||
    participant?.isAdmin === true
  );
}

async function getBotAdminStatus(sock, remoteJid) {
  try {
    const metadata = await sock.groupMetadata(remoteJid);
    const botRaw = sock.user?.id || sock.user?.jid || sock.user?.lid || '';
    const botNum = number(botRaw);

    const bot = metadata.participants.find(p => {
      const pNum = number(p.id);
      return pNum === botNum;
    });

    // DEBUG: Ver qué detecta el bot
    if (!bot) {
      console.log(`[DEBUG] Bot no encontrado en la lista. BotNum: ${botNum}`);
      return false;
    }
    
    const isBotAdmin = isAdminParticipant(bot);
    if (!isBotAdmin) console.log(`[DEBUG] Bot encontrado, pero isAdmin es falso. Datos: ${JSON.stringify(bot)}`);
    
    return isBotAdmin;
  } catch (e) {
    console.log("[DEBUG] Error consultando metadata:", e);
    return false;
  }
}

async function getUserAdminStatus(sock, remoteJid, senderJid) {
  try {
    const metadata = await sock.groupMetadata(remoteJid);
    const userNum = number(senderJid);
    const participant = metadata.participants.find(p => number(p.id) === userNum);
    return isAdminParticipant(participant);
  } catch {
    return false;
  }
}

// ==========================================
// COMANDO AGREGAR
// ==========================================
module.exports = {
    commands: ['add', 'agregar', 'añadir'],
    
    execute: async (ctx) => {
        const { sock, remoteJid, msg, sender, args, fromGroup, isOwner } = ctx;

        if (!fromGroup) {
            return sock.sendMessage(remoteJid, { text: '❌ Solo funciona en grupos.' }, { quoted: msg });
        }

        // 🔥 Verificación en tiempo real usando la lógica robusta 🔥
        const botIsAdmin = await getBotAdminStatus(sock, remoteJid);
        const userIsAdmin = await getUserAdminStatus(sock, remoteJid, sender);

        if (!userIsAdmin && !isOwner) {
            return sock.sendMessage(remoteJid, { text: '❌ Necesitas ser Admin o Owner.' }, { quoted: msg });
        }

        if (!botIsAdmin) {
            return sock.sendMessage(remoteJid, { text: '❌ Necesito ser administrador del grupo para agregar personas.', footer: 'Verifica mis permisos en el grupo.' }, { quoted: msg });
        }

        const targetNumber = args.join('').replace(/\D/g, '');
        if (!targetNumber || targetNumber.length < 10) {
            return sock.sendMessage(remoteJid, { text: '❌ Número inválido. Ejemplo: .add 5215512345678' }, { quoted: msg });
        }

        const targetJid = `${targetNumber}@s.whatsapp.net`;

        try {
            await sock.groupParticipantsUpdate(remoteJid, [targetJid], 'add');
            await sock.sendMessage(remoteJid, { text: `✅ Agregado: @${targetNumber}`, mentions: [targetJid] }, { quoted: msg });
        } catch (error) {
            await sock.sendMessage(remoteJid, { text: `❌ Error al agregar. (¿Privacidad cerrada o número incorrecto?).`, mentions: [targetJid] }, { quoted: msg });
        }
    }
};
