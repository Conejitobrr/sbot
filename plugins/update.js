'use strict';

const { exec } = require('child_process');

module.exports = {
  commands: ['update'],

  async execute(ctx) {
    const { sock, msg, remoteJid, sender, config } = ctx;

    const senderNum = sender.split('@')[0];

    // 🔒 Solo owner
    if (!config.owner.includes(senderNum)) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Este comando es solo para el owner'
      }, { quoted: msg });
    }

    await sock.sendMessage(remoteJid, {
      text: '🔄 Actualizando desde GitHub...'
    }, { quoted: msg });

    exec('git pull', async (err, stdout, stderr) => {
      if (err) {
        console.log(err);
        return sock.sendMessage(remoteJid, {
          text: '❌ Error al actualizar'
        }, { quoted: msg });
      }

      if (stdout.includes('Already up to date')) {
        return sock.sendMessage(remoteJid, {
          text: '✅ Ya estás en la última versión'
        }, { quoted: msg });
      }

      await sock.sendMessage(remoteJid, {
        text: '✅ Actualizado correctamente\n🔁 Reiniciando...'
      }, { quoted: msg });

      console.log(stdout);

      // 🔁 reiniciar bot
      process.exit(0);
    });
  }
};
