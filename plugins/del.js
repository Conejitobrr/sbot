'use strict';

const dbGlobal = require('../lib/database');

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

async function isPremiumUser(db, sender) {
  try {
    const user = await db.getUser(cleanJid(sender));

    return (
      user?.premium === true ||
      user?.isPremium === true ||
      Number(user?.premiumUntil || 0) > Date.now()
    );
  } catch {
    return false;
  }
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

    const botParticipant = metadata.participants.find(p => {
      const ids = [
        p.id,
        p.jid,
        p.participant,
        p.lid
      ]
        .filter(Boolean)
        .map(cleanJid);

      return ids.some(id => {
        return (
          id === botJid ||
          number(id) === botNum
        );
      });
    });

    console.log('🤖 Bot admin detect:', {
      botJid,
      botNum,
      found: botParticipant
        ? {
            id: botParticipant.id,
            jid: botParticipant.jid,
            lid: botParticipant.lid,
            participant: botParticipant.participant,
            admin: botParticipant.admin
          }
        : null
    });

    return isAdminParticipant(botParticipant);

  } catch (err) {
    console.log('⚠️ Error detectando admin del bot:', err?.message || err);
    return false;
  }
}

async function isUserAdminFallback(sock, remoteJid, sender, groupMetadata) {
  try {
    const metadata = await getFreshMetadata(sock, remoteJid, groupMetadata);

    if (!metadata?.participants?.length) return false;

    const senderJid = cleanJid(sender);
    const senderNum = number(senderJid);

    const participant = metadata.participants.find(p => {
      const ids = [
        p.id,
        p.jid,
        p.participant,
        p.lid
      ]
        .filter(Boolean)
        .map(cleanJid);

      return ids.some(id => {
        return (
          id === senderJid ||
          number(id) === senderNum
        );
      });
    });

    return isAdminParticipant(participant);

  } catch {
    return false;
  }
}

async function tryDeleteMessage(sock, remoteJid, key, isOwnMessage) {
  const attempts = isOwnMessage
    ? [
        { ...key, fromMe: true },
        { ...key, fromMe: false }
      ]
    : [
        { ...key, fromMe: false }
      ];

  let lastError = null;

  for (const deleteKey of attempts) {
    try {
      await sock.sendMessage(remoteJid, {
        delete: deleteKey
      });

      return true;

    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('No se pudo eliminar el mensaje.');
}

module.exports = {
  commands: ['del', 'delete', 'borrar', 'eliminar'],

  async execute(ctx) {
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

    const db = ctx.db || dbGlobal;

    try {
      const premium = await isPremiumUser(db, sender);

      let senderIsAdmin = isAdmin === true;

      if (fromGroup && !senderIsAdmin) {
        senderIsAdmin = await isUserAdminFallback(
          sock,
          remoteJid,
          sender,
          groupMetadata
        );
      }

      if (!isOwner && !senderIsAdmin && !premium) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Solo owner, admins del grupo o usuarios premium pueden usar este comando.'
        }, { quoted: msg });
      }

      const quoted = getContextInfo(msg);

      if (!quoted?.stanzaId) {
        return sock.sendMessage(remoteJid, {
          text:
`❌ Responde al mensaje que quieres eliminar.

Uso:
.del
.borrar
.eliminar`
        }, { quoted: msg });
      }

      const botRaw =
        sock.user?.id ||
        sock.user?.jid ||
        sock.user?.lid ||
        '';

      const botJid = cleanJid(botRaw);
      const botNum = number(botJid);

      const quotedParticipant = cleanJid(quoted.participant || '');
      const quotedNum = number(quotedParticipant);

      const isOwnMessage =
        !quotedParticipant ||
        quotedParticipant === botJid ||
        quotedNum === botNum;

      if (fromGroup && !isOwnMessage) {
        const botAdmin = await isBotAdmin(sock, remoteJid, groupMetadata);

        if (!botAdmin) {
          return sock.sendMessage(remoteJid, {
            text: '❌ Para eliminar mensajes de otras personas, el bot debe ser admin del grupo.'
          }, { quoted: msg });
        }
      }

      if (!fromGroup && !isOwnMessage) {
        return sock.sendMessage(remoteJid, {
          text: '❌ En privado solo puedo eliminar mensajes enviados por el bot.'
        }, { quoted: msg });
      }

      const deleteKey = {
        remoteJid,
        id: quoted.stanzaId,
        fromMe: isOwnMessage
      };

      if (fromGroup && quotedParticipant) {
        deleteKey.participant = quotedParticipant;
      }

      await tryDeleteMessage(sock, remoteJid, deleteKey, isOwnMessage);

      // borrar también el mensaje que ejecutó el comando
      try {
        await new Promise(resolve => setTimeout(resolve, 500));

        const commandDeleteKey = {
          remoteJid: msg.key.remoteJid,
          id: msg.key.id,
          fromMe: true
        };

        if (msg.key.participant) {
          commandDeleteKey.participant = msg.key.participant;
        }

        await tryDeleteMessage(
          sock,
          remoteJid,
          commandDeleteKey,
          true
        );

      } catch (e) {
        console.log(
          '⚠️ No se pudo borrar el comando:',
          e?.message || e
        );
      }

    } catch (err) {
      console.log('❌ Error en del:', err?.message || err);

      return sock.sendMessage(remoteJid, {
        text: '❌ No se pudo eliminar el mensaje.'
      }, { quoted: msg });
    }
  }
};
