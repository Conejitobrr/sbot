'use strict';

const db = require('../lib/database');

function getQuotedInfo(msg) {
  const context =
    msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.imageMessage?.contextInfo ||
    msg.message?.videoMessage?.contextInfo ||
    msg.message?.documentMessage?.contextInfo ||
    msg.message?.audioMessage?.contextInfo;

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
      isAdmin,
      isPremium,
      sender
    } = ctx;

    if (!remoteJid.endsWith('@g.us')) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Solo en grupos.'
      }, { quoted: msg });
    }

    if (!(isAdmin || isPremium || isOwner)) {
      const allowed = await db.canUseNotify(sender, isAdmin, isOwner, isPremium);

      if (!allowed) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Ya usaste tus notificaciones permitidas de hoy.'
        }, { quoted: msg });
      }
    }

    try {
      const metadata = await sock.groupMetadata(remoteJid);
      const users = metadata.participants.map(p => p.id);

      const text = args.join(' ').trim();
      const quoted = getQuotedInfo(msg);

      // ✅ Si responde a foto/video/audio/sticker/documento/texto y usa .hidetag sin texto,
      // el bot reenvía ese mensaje citándolo y mencionando a todos.
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

      // ✅ Si responde a algo y además escribe texto, manda el texto citando el mensaje respondido.
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
