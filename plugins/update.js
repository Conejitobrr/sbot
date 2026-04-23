'use strict';

const { exec } = require('child_process');

module.exports = {
  commands: ['update'],

  async execute(ctx) {
    const { sock, remoteJid, msg } = ctx;

    await sock.sendMessage(remoteJid, {
      text: '🔄 Actualizando bot...'
    }, { quoted: msg });

    exec('git pull', (err, stdout) => {

      if (err) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Error:\n' + err.message
        }, { quoted: msg });
      }

      exec('npm install', async () => {

        await sock.sendMessage(remoteJid, {
          text: '✅ Actualizado\n♻️ Reiniciando con PM2...'
        }, { quoted: msg });

        // 🔁 RESTART SIN APAGARSE
        exec('pm2 restart siriusbot');
      });
    });
  }
};
