'use strict';

module.exports = {
  commands: ['notify', 'tagall'],

  async execute(ctx) {
    const { sock, msg, remoteJid, isOwner, args } = ctx;

    if (!isOwner) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Solo el owner puede usar este comando'
      }, { quoted: msg });
    }

    const text = args.join(' ') || '📢 Atención';

    // ⚠️ Solo grupos
    if (!remoteJid.endsWith('@g.us')) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Este comando es solo para grupos'
      }, { quoted: msg });
    }

    try {
      const metadata = await sock.groupMetadata(remoteJid);
      const participants = metadata.participants;

      const mentions = participants.map(p => p.id);

      // 🔥 MENSAJE CON MENCIONES
      let message = `📢 *NOTIFICACIÓN*\n\n${text}\n\n`;

      for (let user of participants) {
        const num = user.id.split('@')[0];
        message += `@${num} `;
      }

      await sock.sendMessage(remoteJid, {
        text: message,
        mentions
      }, { quoted: msg });

      // 🔥 ENVÍO PRIVADO (CLAVE)
      for (let user of participants) {
        try {
          await sock.sendMessage(user.id, {
            text: `📢 *Mensaje del grupo:*\n\n${text}`
          });
        } catch {}
      }

    } catch (e) {
      console.log(e);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error al enviar notificación'
      }, { quoted: msg });
    }
  }
};
