'use strict';

const { exec } = require('child_process');

module.exports = {
  commands: ['update'],

  async execute(ctx) {
    const { sock, remoteJid, msg } = ctx;

    try {
      await sock.sendMessage(remoteJid, {
        text: '🔄 Actualizando bot desde GitHub...'
      }, { quoted: msg });

      // 🔥 actualizar repo
      exec('git pull && npm install', (err, stdout, stderr) => {
        if (err) {
          return sock.sendMessage(remoteJid, {
            text: '❌ Error al actualizar:\n' + err.message
          }, { quoted: msg });
        }

        sock.sendMessage(remoteJid, {
          text:
`✅ Bot actualizado correctamente

♻️ Reiniciando para aplicar cambios...`
        }, { quoted: msg });

        // 🔁 reinicio real del proceso (Termux)
        setTimeout(() => {
          exec('pkill -f node && node index.js');
        }, 1500);
      });

    } catch (e) {
      await sock.sendMessage(remoteJid, {
        text: '❌ Error inesperado:\n' + e.message
      }, { quoted: msg });
    }
  }
};
