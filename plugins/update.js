'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CONFIG_PATH = path.join(process.cwd(), 'config.js');

function bumpVersion(version = '1.0.0') {
  let [major, minor, patch] = String(version)
    .split('.')
    .map(n => parseInt(n, 10));

  major = Number.isFinite(major) ? major : 1;
  minor = Number.isFinite(minor) ? minor : 0;
  patch = Number.isFinite(patch) ? patch : 0;

  patch++;

  if (patch > 9) {
    patch = 0;
    minor++;
  }

  if (minor > 9) {
    minor = 0;
    major++;
  }

  return `${major}.${minor}.${patch}`;
}

function updateConfigVersion() {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error('No encontré config.js');
  }

  const content = fs.readFileSync(CONFIG_PATH, 'utf8');

  const regex = /(botVersion\s*:\s*['"])(\d+\.\d+\.\d+)(['"])/;
  const match = content.match(regex);

  if (!match) {
    throw new Error('No encontré botVersion en config.js');
  }

  const oldVersion = match[2];
  const newVersion = bumpVersion(oldVersion);

  const updated = content.replace(regex, `$1${newVersion}$3`);

  fs.writeFileSync(CONFIG_PATH, updated);

  try {
    delete require.cache[require.resolve('../config')];
  } catch {}

  return {
    oldVersion,
    newVersion
  };
}

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

      const versionInfo = updateConfigVersion();

      if (global.loadPlugins) {
        global.loadPlugins();
      }

      const mediaFiles = changes.filter(f => f.startsWith('media/'));
      const pluginFiles = changes.filter(f => f.startsWith('plugins/'));

      let report = '✅ *Bot actualizado correctamente*\n\n';

      report += `📦 *Versión anterior:* ${versionInfo.oldVersion}\n`;
      report += `🚀 *Nueva versión:* ${versionInfo.newVersion}\n\n`;

      if (changes.length === 0) {
        report += '📌 No hubo cambios nuevos\n';
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
          report += '\n';
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
