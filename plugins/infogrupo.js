'use strict';

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

function isAdminParticipant(participant = {}) {
  return (
    participant?.admin === 'admin' ||
    participant?.admin === 'superadmin' ||
    participant?.isAdmin === true
  );
}

function getParticipantId(participant = {}) {
  return cleanJid(
    participant.id ||
    participant.jid ||
    participant.participant ||
    participant.lid ||
    ''
  );
}

function formatDate(timestamp) {
  const n = Number(timestamp || 0);

  if (!n) return 'Desconocida';

  const date = new Date(n * 1000);

  if (Number.isNaN(date.getTime())) return 'Desconocida';

  return date.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function cleanText(text = '') {
  return String(text || '')
    .replace(/\r/g, '')
    .trim();
}

async function getFreshMetadata(sock, remoteJid, groupMetadata) {
  try {
    const metadata = await sock.groupMetadata(remoteJid);

    if (metadata?.id) return metadata;
  } catch {}

  return groupMetadata || null;
}

module.exports = {
  commands: ['infogrupo', 'groupinfo', 'gpinfo'],

  async execute(ctx) {
    const {
      sock,
      msg,
      remoteJid,
      fromGroup,
      groupMetadata
    } = ctx;

    try {
      if (!fromGroup) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Este comando solo funciona en grupos.'
        }, { quoted: msg });
      }

      const metadata = await getFreshMetadata(sock, remoteJid, groupMetadata);

      if (!metadata) {
        return sock.sendMessage(remoteJid, {
          text: '❌ No pude obtener la información del grupo.'
        }, { quoted: msg });
      }

      const participants = Array.isArray(metadata.participants)
        ? metadata.participants
        : [];

      const admins = participants.filter(isAdminParticipant);

      const groupName = metadata.subject || 'Sin nombre';
      const groupId = metadata.id || remoteJid;
      const owner = cleanJid(metadata.owner || metadata.subjectOwner || '');
      const createdAt = formatDate(metadata.creation);
      const desc = cleanText(metadata.desc || '');

      const groupStatus = metadata.announce
        ? 'Cerrado 🔒'
        : 'Abierto 🔓';

      const editStatus = metadata.restrict
        ? 'Solo admins'
        : 'Todos';

      const adminsText = admins.length
        ? admins
            .slice(0, 15)
            .map((p, i) => {
              const jid = getParticipantId(p);
              const role = p.admin === 'superadmin' ? ' 👑' : '';
              return `${i + 1}. @${number(jid)}${role}`;
            })
            .join('\n')
        : 'No detectados';

      const extraAdmins = admins.length > 15
        ? `\n... y ${admins.length - 15} admin(s) más`
        : '';

      const mentions = [
        ...admins.map(getParticipantId),
        owner
      ].filter(Boolean);

      const caption =
`👥 *INFORMACIÓN DEL GRUPO*

📌 *Nombre:*
${groupName}

🆔 *ID:*
${groupId}

👤 *Miembros:* ${participants.length}
🛡️ *Admins:* ${admins.length}
👑 *Creador:* ${owner ? `@${number(owner)}` : 'Desconocido'}

📅 *Creado:*
${createdAt}

💬 *Estado del chat:* ${groupStatus}
⚙️ *Editar info:* ${editStatus}

📝 *Descripción:*
${desc || 'Sin descripción'}

👮 *Lista de admins:*
${adminsText}${extraAdmins}`;

      let ppUrl = null;

      try {
        ppUrl = await sock.profilePictureUrl(remoteJid, 'image');
      } catch {}

      if (ppUrl) {
        return sock.sendMessage(remoteJid, {
          image: { url: ppUrl },
          caption,
          mentions
        }, { quoted: msg });
      }

      return sock.sendMessage(remoteJid, {
        text: caption,
        mentions
      }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error en infogrupo:', err?.message || err);

      return sock.sendMessage(remoteJid, {
        text: '❌ Ocurrió un error obteniendo la información del grupo.'
      }, { quoted: msg });
    }
  }
};
