'use strict';

const { exec } = require('child_process');

let updating = false; // 🚫 evita spam

module.exports = {
  commands: ['update'],
  description: 'Actualiza el bot desde GitHub',

  async execute(ctx) {
    const { sock, remoteJid, msg } = ctx;

    // 🚫 evitar múltiples updates al mismo tiempo
    if (updating) {
      return sock.sendMessage(remoteJid, {
        text: '⏳ Ya hay una actualización en curso...'
      }, { quoted: msg });
    }

    updating = true;

    await sock.sendMessage(remoteJid, {
      text: '🔄 Buscando actualizaciones...'
    }, { quoted: msg });

    exec('git pull', (err, stdout) => {

      if (err) {
        updating = false;
        return sock.sendMessage(remoteJid, {
          text: '❌ Error al actualizar:\n' + err.message
        }, { quoted: msg });
      }

      // 📌 Si no hay cambios
      if (stdout.includes('Already up to date')) {
        updating = false;
        return sock.sendMessage(remoteJid, {
          text: '✅ El bot ya está actualizado'
        }, { quoted: msg });
      }

      // 📦 instalar dependencias
      exec('npm install', async () => {

        await sock.sendMessage(remoteJid, {
          text: '✅ Actualización aplicada\n♻️ Reiniciando...'
        }, { quoted: msg });

        // 🔁 PM2 reinicia automáticamente
        process.exit(0);
      });
    });
  }
};
