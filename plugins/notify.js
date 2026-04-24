'use strict';

module.exports = {
  commands: ['notify', 'hidetag', 'notificar'],

  async execute(ctx) {
    const { sock, msg, remoteJid, args, isOwner, isAdmin } = ctx;

    if (!(isAdmin || isOwner)) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Solo admins pueden usar esto'
      }, { quoted: msg });
    }

    if (!remoteJid.endsWith('@g.us')) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Solo en grupos'
      }, { quoted: msg });
    }

    const text = args.join(' ') || '📢 Atención';

    try {
      const metadata = await sock.groupMetadata(remoteJid);
      const participants = metadata.participants;

      const users = participants.map(p => p.id);

      // 🔥 CARACTER INVISIBLE (TRUCO CLAVE)
      const invisible = String.fromCharCode(8206).repeat(1000);

      const message = {
        extendedTextMessage: {
          text: `${invisible}\n📢 *NOTIFICACIÓN*\n\n${text}`,
          contextInfo: {
            mentionedJid: users,
            forwardingScore: 999,
            isForwarded: true
          }
        }
      };

      // 🔥 ENVÍO POTENTE
      await sock.relayMessage(remoteJid, message, {
        messageId: msg.key.id
      });

    } catch (e) {
      console.log(e);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error al notificar'
      }, { quoted: msg });
    }
  }
};
