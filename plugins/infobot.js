'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const config = require('../config');

function formatUptime(seconds = 0) {
  seconds = Math.floor(Number(seconds) || 0);

  const days = Math.floor(seconds / 86400);
  seconds %= 86400;

  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;

  const minutes = Math.floor(seconds / 60);
  seconds %= 60;

  const parts = [];

  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds || !parts.length) parts.push(`${seconds}s`);

  return parts.join(' ');
}

function formatBytes(bytes = 0) {
  const n = Number(bytes) || 0;

  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(2)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(2)} MB`;

  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

function countPluginFiles() {
  try {
    const pluginsDir = path.join(process.cwd(), 'plugins');

    if (!fs.existsSync(pluginsDir)) return 0;

    return fs.readdirSync(pluginsDir)
      .filter(file => file.endsWith('.js'))
      .length;
  } catch {
    return 0;
  }
}

function getCommandsCount() {
  try {
    if (global.plugins && Array.isArray(global.plugins)) {
      let total = 0;

      for (const plugin of global.plugins) {
        if (Array.isArray(plugin?.commands)) {
          total += plugin.commands.length;
        }
      }

      return total;
    }

    if (global.commands && typeof global.commands === 'object') {
      return Object.keys(global.commands).length;
    }

    return 0;
  } catch {
    return 0;
  }
}

module.exports = {
  commands: ['infobot', 'botinfo', 'info', 'sirius'],

  async execute(ctx) {
    const {
      sock,
      msg,
      remoteJid,
      sender,
      pushName,
      fromGroup
    } = ctx;

    try {
      const memory = process.memoryUsage();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;

      const pluginFiles = countPluginFiles();
      const commandsCount = getCommandsCount();

      const botName = config.botName || 'SiriusBot';
      const version = config.botVersion || '1.0.0';
      const prefix = config.prefix || '.';

      const botNumber = String(sock.user?.id || sock.user?.jid || '')
        .split('@')[0]
        .split(':')[0];

      const text =
`╭━━━〔 🤖 *INFO BOT* 〕━━━⬣
┃
┃ 🤖 *Nombre:* ${botName}
┃ 📦 *Versión:* ${version}
┃ ⚙️ *Prefijo:* ${prefix}
┃ 👑 *Owner:* ${Array.isArray(config.owner) ? config.owner.length : 0}
┃
┃ 📱 *Número del bot:*
┃ wa.me/${botNumber}
┃
┃ 👤 *Solicitado por:*
┃ ${pushName || 'Usuario'}
┃
┣━━━〔 ⚡ *SISTEMA* 〕━━━⬣
┃
┃ ⏱️ *Activo:* ${formatUptime(process.uptime())}
┃ 🟢 *Estado:* En línea
┃ 🧠 *Node.js:* ${process.version}
┃ 💻 *Plataforma:* ${os.platform()} ${os.arch()}
┃
┣━━━〔 📁 *BOT* 〕━━━⬣
┃
┃ 📂 *Plugins:* ${pluginFiles}
┃ 🔥 *Comandos:* ${commandsCount || 'No detectado'}
┃ 💬 *Chat:* ${fromGroup ? 'Grupo' : 'Privado'}
┃
┣━━━〔 🧩 *MEMORIA* 〕━━━⬣
┃
┃ 📌 *RAM usada por bot:* ${formatBytes(memory.rss)}
┃ 📊 *Heap usado:* ${formatBytes(memory.heapUsed)}
┃ 🧾 *Heap total:* ${formatBytes(memory.heapTotal)}
┃
┃ 💽 *RAM del sistema:*
┃ ${formatBytes(usedMem)} / ${formatBytes(totalMem)}
┃
╰━━━━━━━━━━━━━━━━━━━━⬣

${config.footer || botName}`;

      return sock.sendMessage(remoteJid, {
        text
      }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error en infobot:', err?.message || err);

      return sock.sendMessage(remoteJid, {
        text: '❌ Ocurrió un error mostrando la información del bot.'
      }, { quoted: msg });
    }
  }
};
