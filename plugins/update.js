'use strict';

const { exec } = require('child_process');

module.exports = {
  commands: ['update'],

  async execute(ctx) {
    const { sock, remoteJid, msg, isOwner } = ctx;

    // 🔒 SOLO OWNER
    if (!isOwner) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Solo el owner puede usar este comando'
      }, { quoted: msg });
    }

    // ⏳ Mensaje inicial
    await sock.sendMessage(remoteJid, {
      text: '🔄 Actualizando bot desde GitHub...'
    }, { quoted: msg });

    // 🚀 Ejecutar git pull
    exec('git pull', (err, stdout, stderr) => {

      if (err) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Error al actualizar:\n' + err.message
        }, { quoted: msg });
      }

      // 📦 Instalar dependencias (opcional)
      exec('npm install', async () => {

        await sock.sendMessage(remoteJid, {
          text: '✅ Bot actualizado correctamente\n\n🔁 Reiniciando...'
        }, { quoted: msg });

        // 🔁 Reiniciar bot
        process.exit(0);
      });
    });
  }
};
