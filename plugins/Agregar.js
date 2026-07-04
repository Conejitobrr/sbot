'use strict';

// ==========================================
// FUNCIONES EXACTAS DE TU PLUGIN FUNCIONAL
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

// ==========================================
// COMANDO AGREGAR
// ==========================================
module.exports = {
  commands: ['add', 'agregar', 'añadir'],

  execute: async (ctx) => {
    const { sock, remoteJid, msg, sender, args, fromGroup, isOwner, groupMetadata } = ctx;

    if (!fromGroup) {
      return sock.sendMessage(remoteJid, { text: '❌ Este comando solo funciona en grupos.' }, { quoted: msg });
    }

    // Usamos el motor exacto de tu .kick para detectar administradores
    let senderIsAdmin = false;
    try {
       senderIsAdmin = await isUserAdmin(sock, remoteJid, sender, groupMetadata);
    } catch (e) {}

    // Verificamos al que ejecuta el comando (Admin o Owner)
    if (!senderIsAdmin && !isOwner) {
      return sock.sendMessage(remoteJid, { text: '❌ Solo admins del grupo o el owner pueden usar este comando.' }, { quoted: msg });
    }

    // Verificamos al bot con la función infalible
    const botAdmin = await isBotAdmin(sock, remoteJid, groupMetadata);
    if (!botAdmin) {
      return sock.sendMessage(remoteJid, { text: '❌ Necesito ser administrador del grupo para agregar personas.' }, { quoted: msg });
    }

    // Extraer y limpiar el número (soporta 52, 521, +51, espacios, etc.)
    const targetNumber = args.join('').replace(/\D/g, '');
    
    if (!targetNumber || targetNumber.length < 10) {
      return sock.sendMessage(remoteJid, { text: '❌ Debes escribir un número de teléfono válido. Ejemplo: .add 5215512345678' }, { quoted: msg });
    }

    const targetJid = `${targetNumber}@s.whatsapp.net`;

    try {
      await sock.sendMessage(remoteJid, { text: `⏳ Agregando a @${targetNumber}...`, mentions: [targetJid] }, { quoted: msg });
      
      const response = await sock.groupParticipantsUpdate(remoteJid, [targetJid], 'add');
      
      // Control de estados de privacidad de WhatsApp
      const status = response[0]?.status || response[targetJid]?.code || '200';

      if (status === '403' || status == 403) {
          return sock.sendMessage(remoteJid, { 
              text: `⚠️ No pude agregarlo. La privacidad de @${targetNumber} bloquea invitaciones directas a grupos.`, 
              mentions: [targetJid] 
          }, { quoted: msg });
      } 
      else if (status === '409' || status == 409) {
          return sock.sendMessage(remoteJid, { text: `⚠️ @${targetNumber} ya está en este grupo.`, mentions: [targetJid] }, { quoted: msg });
      } 
      else {
          return sock.sendMessage(remoteJid, { text: `✅ ¡@${targetNumber} ha sido agregado exitosamente!`, mentions: [targetJid] }, { quoted: msg });
      }

    } catch (error) {
      console.log('Error en comando add:', error);
      return sock.sendMessage(remoteJid, { text: `❌ Ocurrió un error al intentar agregar a @${targetNumber}. Verifica que el número sea correcto.`, mentions: [targetJid] }, { quoted: msg });
    }
  }
};
