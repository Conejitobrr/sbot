'use strict';

module.exports = {
  commands: ['contacto', 'creador', 'owner', 'soporte'],

  async execute({ sock, remoteJid, msg }) {
    try {
      const ownerNumber = '51958959882';
      const ownerName = 'Desarrollador del Bot'; // ✏️ Puedes cambiar este nombre

      // Creamos la tarjeta de contacto oficial (vCard)
      const vcard = 'BEGIN:VCARD\n' +
                    'VERSION:3.0\n' +
                    `FN:${ownerName}\n` +
                    `TEL;type=CELL;type=VOICE;waid=${ownerNumber}:+${ownerNumber}\n` +
                    'END:VCARD';

      // 1. Enviamos la tarjeta de contacto interactiva
      await sock.sendMessage(remoteJid, {
        contacts: {
          displayName: ownerName,
          contacts: [{ vcard }]
        }
      }, { quoted: msg });

      // 2. Enviamos un mensajito extra con el link directo
      await sock.sendMessage(remoteJid, {
        text: `👋 ¡Hola! Si necesitas ayuda personalizada, tienes sugerencias o quieres reportar algo grave, puedes hablarle a mi creador tocando el contacto de arriba o a través de este enlace rápido:\n\n🔗 https://wa.me/${ownerNumber}`
      });

    } catch (err) {
      console.log('❌ Error en comando contacto:', err);
      // Respaldo por si falla la tarjeta de contacto
      await sock.sendMessage(remoteJid, {
        text: `📞 *Contacto del Creador:*\n\nSi necesitas ayuda, escribe a: +51 958 959 882\n🔗 https://wa.me/51958959882`
      }, { quoted: msg });
    }
  }
};
