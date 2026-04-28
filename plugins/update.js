'use strict';

const { execSync } = require('child_process');

module.exports = {
  commands: ['update'],

  async execute(ctx) {
    const { sock, remoteJid, msg } = ctx;

    try {
      await sock.sendMessage(remoteJid, {
        text: '🔄 Actualizando bot desde GitHub...'
      }, { quoted: msg });

      // 🔥 Obtener commit actual ANTES del update
      const oldCommit = execSync('git rev-parse HEAD').toString().trim();

      // 🔥 Hacer update
      execSync('git pull', { stdio: 'pipe' });

      // 🔥 Obtener commit nuevo
      const newCommit = execSync('git rev-parse HEAD').toString().trim();

      // 🔥 Ver archivos modificados
      let changes = [];
      if (oldCommit !== newCommit) {
        const diff = execSync(`git diff --name-only ${oldCommit} ${newCommit}`)
          .toString()
          .trim();

        if (diff) {
          changes = diff.split('\n');
        }
      }

      // 🔥 Instalar dependencias si hay package.json
      try {
        execSync('npm install', { stdio: 'pipe' });
      } catch {}

      // 🔥 Recargar plugins
      if (global.loadPlugins) {
        global.loadPlugins();
      }

      // 🔥 Separar cambios
      const mediaFiles = changes.filter(f => f.startsWith('media/'));
      const pluginFiles = changes.filter(f => f.startsWith('plugins/'));

      // 🔥 Formatear texto
      let report = '✅ *Bot actualizado correctamente*\n\n';

      if (changes.length === 0) {
        report += '📌 No hubo cambios nuevos';
      } else {

        if (mediaFiles.length) {
          report += '🎵 *Archivos multimedia agregados/actualizados:*\n';
          mediaFiles.forEach(f => {
            report += `➤ /${f}\n`;
          });
          report += '\n';
        }

        if (pluginFiles.length) {
          report += '⚙️ *Plugins actualizados:*\n';
          pluginFiles.forEach(f => {
            report += `➤ ${f}\n`;
          });
          report += '\n';
        }

        // 🔥 Otros archivos
        const others = changes.filter(f => 
          !f.startsWith('media/') && !f.startsWith('plugins/')
        );

        if (others.length) {
          report += '📁 *Otros cambios:*\n';
          others.forEach(f => {
            report += `➤ ${f}\n`;
          });
        }
      }

      report += '\n♻️ Plugins recargados\n⚡ Sin reiniciar el bot';

      await sock.sendMessage(remoteJid, {
        text: report
      }, { quoted: msg });

    } catch (e) {
      await sock.sendMessage(remoteJid, {
        text: '❌ Error al actualizar:\n' + e.message
      }, { quoted: msg });
    }
  }
};
