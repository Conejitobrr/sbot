'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ENV_PATH = path.join(process.cwd(), '.env');

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

function getCurrentVersion() {
  if (process.env.BOT_VERSION) {
    return process.env.BOT_VERSION;
  }

  try {
    delete require.cache[require.resolve('../config')];

    const config = require('../config');
    return config.botVersion || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

function updateEnvVersion() {
  const oldVersion = getCurrentVersion();
  const newVersion = bumpVersion(oldVersion);

  let envContent = '';

  if (fs.existsSync(ENV_PATH)) {
    envContent = fs.readFileSync(ENV_PATH, 'utf8');
  }

  if (/^BOT_VERSION\s*=/m.test(envContent)) {
    envContent = envContent.replace(
      /^BOT_VERSION\s*=.*$/m,
      `BOT_VERSION=${newVersion}`
    );
  } else {
    if (envContent && !envContent.endsWith('\n')) {
      envContent += '\n';
    }

    envContent += `BOT_VERSION=${newVersion}\n`;
  }

  fs.writeFileSync(ENV_PATH, envContent);

  process.env.BOT_VERSION = newVersion;

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

      // 🔥 HOT-RELOAD: Limpiamos la caché de los archivos clave modificados
      changes.forEach(file => {
        if (file.endsWith('.js')) {
          const fullPath = path.join(process.cwd(), file);
          if (fs.existsSync(fullPath)) {
            try {
              delete require.cache[require.resolve(fullPath)];
            } catch (err) {
              // Ignoramos si el archivo no estaba en caché previamente
            }
          }
        }
      });

      try {
        execSync('npm install', { stdio: 'pipe' });
      } catch {}

      const versionInfo = updateEnvVersion();

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
          report += '📁 *Otros cambios (Caché refrescada):*\n';
          others.forEach(f => {
            report += `➤ ${f}\n`;
          });
          report += '\n';
        }
      }

      report += '\n♻️ Sistema recargado en memoria\n⚡ Cambios aplicados sin reiniciar';

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
