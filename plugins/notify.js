'use strict';

const db = require('../lib/database');
const config = require('../config');

function cleanNumber(jid = '') {
  return String(jid)
    .split('@')[0]
    .split(':')[0]
    .replace(/\D/g, '');
}

function getQuotedInfo(msg) {
  const context =
    msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.imageMessage?.contextInfo ||
    msg.message?.videoMessage?.contextInfo ||
    msg.message?.documentMessage?.contextInfo ||
    msg.message?.audioMessage?.contextInfo ||
    msg.message?.stickerMessage?.contextInfo;

  if (!context?.quotedMessage) return null;

  return {
    quotedMessage: context.quotedMessage,
    participant: context.participant,
    stanzaId: context.stanzaId
  };
}

module.exports = {
  commands: ['notify', 'hidetag', 'notificar'],

  async execute(ctx) {
    const {
      sock,
      msg,
      remoteJid,
      args,
      sender
    } = ctx;

    if (!remoteJid.endsWith('@g.us')) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Solo funciona en grupos.'
      }, { quoted: msg });
    }

    try {
      const ownerNumbers = Array.isArray(config.owner)
        ? config.owner.map(n => String(n).replace(/\D/g, ''))
        : [];

      const senderNumber = cleanNumber(sender);
      const realNumber = cleanNumber(msg.realNumber || '');
      const participantNumber = cleanNumber(msg.key?.participant || '');
      const remoteNumber = cleanNumber(msg.key?.remoteJid || '');

      const isOwnerUser =
        msg.key?.fromMe ||
        ctx.isOwner ||
        ownerNumbers.includes(senderNumber) ||
        ownerNumbers.includes(realNumber) ||
        ownerNumbers.includes(participantNumber) ||
        ownerNumbers.includes(remoteNumber);

      const isPremiumUser = await db.isPremium(sender);

      let remaining = null;

      if (!isOwnerUser && !isPremiumUser) {
        const allowed = await db.canUseNotify(sender, false, false, false);
        remaining = await db.getRemainingUses(sender);

        if (!allowed) {
          return sock.sendMessage(remoteJid, {
            text:
`❌ Ya usaste tus *5 notificaciones gratis* de hoy.

⭐ Hazte premium para uso ilimitado.`
          }, { quoted: msg });
        }
      }

      const metadata = await sock.groupMetadata(remoteJid);
      const users = metadata.participants.map(p => p.id);

      const text = args.join(' ').trim();
      const quoted = getQuotedInfo(msg);

      const extra =
        remaining !== null
          ? `\n\n📊 Usos restantes: ${remaining}/5`
          : '';

      if (quoted && !text) {
        return await sock.sendMessage(
          remoteJid,
          {
            forward: {
              key: {
                remoteJid,
                fromMe: false,
                id: quoted.stanzaId,
                participant: quoted.participant
              },
              message: quoted.quotedMessage
            },
            mentions: users
          },
          { quoted: msg }
        );
      }

      if (quoted && text) {
        return await sock.sendMessage(
          remoteJid,
          {
            text: text + extra,
            mentions: users
          },
          {
            quoted: {
              key: {
                remoteJid,
                fromMe: false,
                id: quoted.stanzaId,
                participant: quoted.participant
              },
              message: quoted.quotedMessage
            }
          }
        );
      }

      if (!text) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Escribe un mensaje o responde a uno.'
        }, { quoted: msg });
      }

      await sock.sendMessage(
        remoteJid,
        {
          text: text + extra,
          mentions: users
        },
        { quoted: msg }
      );

    } catch (e) {
      console.log('❌ Error notify:', e?.stack || e);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error al enviar notificación.'
      }, { quoted: msg });
    }
  }
};
