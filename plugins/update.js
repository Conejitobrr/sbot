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

      // 🔥 git pull
      exec('git pull', (err, stdout) => {
        if (err) {
          return sock.sendMessage(remoteJid, {
            text: '❌ Error en git pull:\n' + err.message
          }, { quoted: msg });
        }

        sock.sendMessage(remoteJid, {
          text: '📦 Repositorio actualizado\n📥 Instalando dependencias...'
        }, { quoted: msg });

        // 🔥 npm install
        exec('npm install', async (err2) => {
          if (err2) {
            return sock.sendMessage(remoteJid, {
              text: '❌ Error en npm install:\n' + err2.message
            }, { quoted: msg });
          }

          await sock.sendMessage(remoteJid, {
            text:
`✅ Bot actualizado correctamente

⚠️ Reinicio automático no activo
👉 Ejecuta manualmente:

node index.js`
          }, { quoted: msg });

          // ❌ NO matamos el proceso (evita cierre)
        });
      });

    } catch (e) {
      await sock.sendMessage(remoteJid, {
        text: '❌ Error inesperado:\n' + e.message
      }, { quoted: msg });
    }
  }
};
