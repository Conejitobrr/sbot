'use strict';

module.exports = {
  commands: ['descargar'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg } = ctx;
    const url = args[0];

    if (!url || !url.includes('facebook.com')) {
      return sock.sendMessage(remoteJid, { text: '❌ Por favor, envía un enlace de Facebook válido.' }, { quoted: msg });
    }

    // Aquí le damos el formato para que Web Video Caster lo detecte al instante
    const respuesta = `✅ *Video listo para tu TV*\n\n1. Copia el enlace de abajo.\n2. Ábrelo en la app *Web Video Caster*.\n3. Presiona el botón de "Play" y disfruta.\n\n🔗 ${url}`;

    await sock.sendMessage(remoteJid, { text: respuesta }, { quoted: msg });
  }
};
