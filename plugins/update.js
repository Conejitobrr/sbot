'use strict';

const { exec } = require('child_process');

module.exports = {
  commands: ['update'],

  async execute(ctx) {
    const { sock, remoteJid, msg } = ctx;

    await sock.sendMessage(remoteJid, {
      text: '🔄 Actualizando bot...'
    }, { quoted: msg });

    // 🔥 SOLO ACTUALIZAR
    exec('git pull && npm install', (err) => {
      if (err) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Error al actualizar:\n' + err.message
        }, { quoted: msg });
      }

      sock.sendMessage(remoteJid, {
        text:
`✅ Actualizado correctamente

⚠️ Para aplicar cambios ejecuta manualmente:
node index.js`
      }, { quoted: msg });

      // ❌ NO matamos el proceso
    });
  }
};
