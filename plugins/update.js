'use strict';

const { exec } = require('child_process');
const fs = require('fs');

module.exports = {
  commands: ['update'],

  async execute(ctx) {
    const { sock, remoteJid, msg } = ctx;

    await sock.sendMessage(remoteJid, {
      text: '🔄 Actualizando bot sin reinicio...'
    }, { quoted: msg });

    exec('git pull && npm install', async (err, stdout) => {
      if (err) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Error:\n' + err.message
        }, { quoted: msg });
      }

      try {
        // 🔥 LIMPIAR CACHE DE PLUGINS
        const pluginsPath = './plugins';

        const files = fs.readdirSync(pluginsPath);

        for (const file of files) {
          const filePath = require.resolve(`./plugins/${file}`);
          delete require.cache[filePath];
        }

        // 🔥 RECARGA FORZADA DEL BOT (si tienes loader dinámico)
        if (global.reloadPlugins) {
          await global.reloadPlugins();
        }

        await sock.sendMessage(remoteJid, {
          text:
`✅ Actualizado y recargado

♻️ Plugins recargados sin reiniciar bot`
        }, { quoted: msg });

      } catch (e) {
        await sock.sendMessage(remoteJid, {
          text:
`⚠️ Actualizado pero no se pudo recargar automáticamente

👉 Reinicia manualmente si ves errores`
        }, { quoted: msg });
      }
    });
  }
};
