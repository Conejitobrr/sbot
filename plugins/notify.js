'use strict';

const db = require('../lib/database');

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
      isOwner,
      sender
    } = ctx;

    if (!remoteJid.endsWith('@g.us')) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Solo funciona en grupos.'
      }, { quoted: msg });
    }

    try {
      const isPremiumUser = await db.isPremium(sender);

      // 👑 Owner = ilimitado
      // ⭐ Premium = ilimitado
      // 👤 Normal = 5 usos gratis al día
      if (!isOwner && !isPremiumUser) {
        const allowed = await db.canUseNotify(sender, false, false, false);

        if (!allowed) {
          return sock.sendMessage(remoteJid, {
            text:
`❌ Ya usaste tus *5 notificaciones gratis* de hoy.

⭐ Hazte premium para usar *.notify / .hidetag / .notificar* sin límite.`
          }, { quoted: msg });
        }
      }

      const metadata = await sock.groupMetadata(remoteJid);
      const users = metadata.participants.map(p => p.id);

      const text = args.join(' ').trim();
      const quoted = getQuotedInfo(msg);

      // Responder a texto/foto/video/audio/sticker/documento con .hidetag
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

      // Responder a algo con .hidetag mensaje
      if (quoted && text) {
        return await sock.sendMessage(
          remoteJid,
          {
            text,
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
          text: '❌ Escribe un mensaje o responde a un mensaje con *.hidetag*.'
        }, { quoted: msg });
      }

      await sock.sendMessage(
        remoteJid,
        {
          text,
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
