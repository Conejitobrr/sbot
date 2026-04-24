'use strict';

const { exec } = require('child_process');

module.exports = {
  commands: ['update'],

  async execute(ctx) {
    const { sock, remoteJid, msg } = ctx;

    await sock.sendMessage(remoteJid, {
      text: '🔄 Actualizando bot...'
    }, { quoted: msg });

    exec('git pull && npm install', async (err) => {
      if (err) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Error:\n' + err.message
        }, { quoted: msg });
      }

      // 🔥 RECARGA EN CALIENTE
      if (global.loadPlugins) {
        global.loadPlugins();
      }

      await sock.sendMessage(remoteJid, {
        text:
`✅ Bot actualizado

♻️ Plugins recargados correctamente
⚡ Cambios aplicados sin reiniciar`
      }, { quoted: msg });
    });
  }
};
