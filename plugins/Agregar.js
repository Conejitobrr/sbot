'use strict';

// ==========================================
// FUNCIONES DE UTILIDAD Y PERMISOS
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
  return [participant.id, participant.jid, participant.participant, participant.lid]
    .filter(Boolean).map(cleanJid).filter(Boolean);
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

    // Validación de permisos
    let senderIsAdmin = false;
    try { senderIsAdmin = await isUserAdmin(sock, remoteJid, sender, groupMetadata); } catch (e) {}

    if (!senderIsAdmin && !isOwner) {
      return sock.sendMessage(remoteJid, { text: '❌ Solo admins del grupo o el owner pueden usar este comando.' }, { quoted: msg });
    }

    const botAdmin = await isBotAdmin(sock, remoteJid, groupMetadata);
    if (!botAdmin) {
      return sock.sendMessage(remoteJid, { text: '❌ Necesito ser administrador del grupo para agregar personas.' }, { quoted: msg });
    }

    // Limpieza de número ingresado
    const targetNumber = args.join('').replace(/\D/g, '');
    
    if (!targetNumber || targetNumber.length < 10) {
      return sock.sendMessage(remoteJid, { text: '❌ Escribe un número de teléfono válido.\n*Ejemplo:* .add 528992577246' }, { quoted: msg });
    }

    try {
      await sock.sendMessage(remoteJid, { text: `🔍 Consultando el ID interno en los servidores de WhatsApp...` }, { quoted: msg });
      
      // 🔥 ESCÁNER ONWHATSAPP (MAGIA PURA PARA NÚMEROS MEXICANOS/CONFLICTIVOS) 🔥
      const waStatus = await sock.onWhatsApp(targetNumber);
      let realTargetJid = '';

      if (waStatus && waStatus.length > 0 && waStatus[0].exists) {
          realTargetJid = waStatus[0].jid;
      } else {
          // Truco de enrutamiento: Intercambiar 52 y 521 si WhatsApp no lo encuentra a la primera
          if (targetNumber.startsWith('52') && targetNumber.length === 12) {
              const altMex = await sock.onWhatsApp('521' + targetNumber.substring(2));
              if (altMex && altMex.length > 0 && altMex[0].exists) realTargetJid = altMex[0].jid;
          } else if (targetNumber.startsWith('521') && targetNumber.length === 13) {
              const altMex2 = await sock.onWhatsApp('52' + targetNumber.substring(3));
              if (altMex2 && altMex2.length > 0 && altMex2[0].exists) realTargetJid = altMex2[0].jid;
          }
      }

      // Si definitivamente no existe en WhatsApp, abortamos para no crashear
      if (!realTargetJid) {
          return sock.sendMessage(remoteJid, { text: `❌ El número ${targetNumber} no tiene una cuenta de WhatsApp activa o el código de país está mal puesto.` }, { quoted: msg });
      }

      const verifiedNumber = realTargetJid.split('@')[0];

      await sock.sendMessage(remoteJid, { text: `⏳ Agregando a @${verifiedNumber}...`, mentions: [realTargetJid] }, { quoted: msg });
      
      // Acción de agregar con el JID verificado
      const response = await sock.groupParticipantsUpdate(remoteJid, [realTargetJid], 'add');
      
      const status = response[0]?.status || response[realTargetJid]?.code || '200';

      if (status === '403' || status == 403) {
          return sock.sendMessage(remoteJid, { 
              text: `⚠️ La configuración de privacidad de @${verifiedNumber} bloquea invitaciones directas a grupos.`, 
              mentions: [realTargetJid] 
          }, { quoted: msg });
      } 
      else if (status === '409' || status == 409) {
          return sock.sendMessage(remoteJid, { text: `⚠️ El usuario @${verifiedNumber} ya está en este grupo.`, mentions: [realTargetJid] }, { quoted: msg });
      } 
      else {
          return sock.sendMessage(remoteJid, { text: `✅ ¡@${verifiedNumber} ha sido agregado exitosamente!`, mentions: [realTargetJid] }, { quoted: msg });
      }

    } catch (error) {
      console.log('Error en comando add:', error);
      return sock.sendMessage(remoteJid, { text: `❌ Ocurrió un error inesperado al intentar agregar a @${targetNumber}.` }, { quoted: msg });
    }
  }
};
