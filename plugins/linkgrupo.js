'use strict';

module.exports = {
  commands: ['link', 'linkgrupo', 'enlace', 'invitacion', 'invite'],

  async execute(ctx) {
    const {
      sock,
      msg,
      remoteJid,
      fromGroup
    } = ctx;

    try {
      if (!fromGroup) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Este comando solo funciona en grupos.'
        }, { quoted: msg });
      }

      const code = await sock.groupInviteCode(remoteJid);
      const link = `https://chat.whatsapp.com/${code}`;

      // ✅ Mandar SOLO el link limpio.
      // ✅ Con link-preview-js instalado, Baileys/WhatsApp puede generar la preview.
      // ✅ No se pone texto extra porque eso puede hacer que se vea como enlace simple.
      return sock.sendMessage(remoteJid, {
        text: link
      });

    } catch (err) {
      console.log('❌ Error generando link del grupo:', err?.message || err);

      return sock.sendMessage(remoteJid, {
        text:
`❌ No pude generar la invitación del grupo.

Posibles causas:
• El bot no es admin.
• WhatsApp no permitió obtener el enlace.
• El grupo no tiene enlace disponible.`
      }, { quoted: msg });
    }
  }
};
