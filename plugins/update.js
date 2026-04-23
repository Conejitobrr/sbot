'use strict';

const { exec } = require('child_process');

module.exports = {
  commands: ['update'],

  async execute(ctx) {
    const { sock, msg, remoteJid, senderNum, config } = ctx;

    if (!config.owner.includes(senderNum)) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Solo el owner puede usar este comando'
      }, { quoted: msg });
    }

    await sock.sendMessage(remoteJid, {
      text: '🔄 Actualizando desde GitHub...'
    }, { quoted: msg });

    exec('git pull', async (err, stdout) => {
      if (err) {
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
        text: '✅ Actualizado\n🔁 Reiniciando...'
      }, { quoted: msg });

      process.exit(0);
    });
  }
};
      await sock.sendMessage(remoteJid, {
        text: '✅ Actualizado correctamente\n🔁 Reiniciando...'
      }, { quoted: msg });

      console.log(stdout);

      // 🔁 reiniciar bot
      process.exit(0);
    });
  }
};
