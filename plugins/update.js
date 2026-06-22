'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

const ENV_PATH = path.join(process.cwd(), '.env');

function bumpVersion(version = '1.0.0') {
  let [major, minor, patch] = String(version).split('.').map(n => parseInt(n, 10));
  patch = (Number.isFinite(patch) ? patch : 0) + 1;
  if (patch > 9) { patch = 0; minor++; }
  if (minor > 9) { minor = 0; major++; }
  return `${major}.${minor}.${patch}`;
}

function updateEnvVersion() {
  const oldVersion = process.env.BOT_VERSION || '1.0.0';
  const newVersion = bumpVersion(oldVersion);
  let envContent = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
  if (/^BOT_VERSION\s*=/m.test(envContent)) {
    envContent = envContent.replace(/^BOT_VERSION\s*=.*$/m, `BOT_VERSION=${newVersion}`);
  } else {
    envContent += `\nBOT_VERSION=${newVersion}\n`;
  }
  fs.writeFileSync(ENV_PATH, envContent);
  process.env.BOT_VERSION = newVersion;
  return { oldVersion, newVersion };
}

module.exports = {
  commands: ['update'],

  async execute(ctx) {
    const { sock, remoteJid, msg, isOwner } = ctx;

    if (!isOwner) return sock.sendMessage(remoteJid, { text: '❌ Solo el owner.' }, { quoted: msg });

    try {
      await sock.sendMessage(remoteJid, { text: '🔄 Buscando actualizaciones en GitHub...' }, { quoted: msg });

      const oldCommit = execSync('git rev-parse HEAD').toString().trim();
      execSync('git pull', { stdio: 'pipe' });
      const newCommit = execSync('git rev-parse HEAD').toString().trim();

      if (oldCommit === newCommit) {
        return sock.sendMessage(remoteJid, { text: '📌 Ya estás en la última versión.' }, { quoted: msg });
      }

      const diff = execSync(`git diff --name-only ${oldCommit} ${newCommit}`).toString().trim().split('\n');
      
      // 🛠️ RECARGA DINÁMICA (Hot-Reload)
      let recargados = [];
      diff.forEach(file => {
        const fullPath = path.join(process.cwd(), file);
        if (fs.existsSync(fullPath) && file.endsWith('.js')) {
          try {
            // Borramos el caché de los archivos que cambiaron
            delete require.cache[require.resolve(fullPath)];
            recargados.push(file);
          } catch (e) {}
        }
      });

      // Recargar sistema de plugins global si cambiaron plugins
      if (global.loadPlugins) global.loadPlugins();

      try { execSync('npm install', { stdio: 'pipe' }); } catch {}

      const versionInfo = updateEnvVersion();

      let report = `✅ *Bot actualizado*\n\n🚀 *Versión:* ${versionInfo.oldVersion} -> ${versionInfo.newVersion}\n\n`;
      if (recargados.length > 0) {
        report += `♻️ *Archivos recargados en caliente:*\n${recargados.map(f => `➤ ${f}`).join('\n')}\n\n`;
      }
      report += `_Nota: Si cambiaste main.js o el socket, reinicia el bot con PM2._`;

      await sock.sendMessage(remoteJid, { text: report }, { quoted: msg });

    } catch (e) {
      await sock.sendMessage(remoteJid, { text: '❌ Error al actualizar:\n' + e.message }, { quoted: msg });
    }
  }
};
