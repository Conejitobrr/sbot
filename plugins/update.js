'use strict';

const { execSync } = require('child_process');

module.exports = {
  commands: ['update'],

  async execute(ctx) {
    const { sock, remoteJid, msg, isOwner } = ctx;

    if (!isOwner) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Solo el owner puede usar este comando.'
      }, { quoted: msg });
    }

    try {
      await sock.sendMessage(remoteJid, {
        text: '🔄 Actualizando bot desde GitHub...'
      }, { quoted: msg });

      const oldCommit = execSync('git rev-parse HEAD').toString().trim();

      execSync('git pull', { stdio: 'pipe' });

      const newCommit = execSync('git rev-parse HEAD').toString().trim();

      let changes = [];
      if (oldCommit !== newCommit) {
        const diff = execSync(`git diff --name-only ${oldCommit} ${newCommit}`)
          .toString()
          .trim();

        if (diff) {
          changes = diff.split('\n');
        }
      }

      try {
        execSync('npm install', { stdio: 'pipe' });
      } catch {}

      if (global.loadPlugins) {
        global.loadPlugins();
      }

      const mediaFiles = changes.filter(f => f.startsWith('media/'));
      const pluginFiles = changes.filter(f => f.startsWith('plugins/'));

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
