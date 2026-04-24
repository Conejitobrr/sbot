'use strict';

const axios = require('axios');

let lastSHA = '';
let intervalStarted = false;

const owner = 'Conejitobrr';
const repo = 'siriusbot';

global.gitChat = null;

module.exports = {
  commands: ['actualizar', 'actualizacion'],

  async execute(ctx) {
    const { sock, msg, remoteJid } = ctx;

    global.gitChat = remoteJid;

    await sock.sendMessage(remoteJid, {
      text: '🔄 Monitoreo de actualizaciones activado...'
    }, { quoted: msg });

    if (intervalStarted) return;
    intervalStarted = true;

    setInterval(async () => {
      try {
        const res = await axios.get(
          `https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`
        );

        const commit = res.data[0];
        const sha = commit.sha;
        const message = commit.commit.message;

        if (sha !== lastSHA) {
          lastSHA = sha;

          // 🔥 EXTRAER SOLO NOMBRE DEL ARCHIVO
          const files = commit.files || [];

          let changedFiles = '';

          if (files.length > 0) {
            changedFiles = files
              .map(f => `📦 ${f.filename}`)
              .join('\n');
          } else {
            // fallback: intentar sacar del mensaje
            changedFiles = `📦 ${message}`;
          }

          if (global.gitChat) {
            await sock.sendMessage(global.gitChat, {
              text:
`🚀 *Actualización detectada*

${changedFiles}`
            });
          }
        }

      } catch (e) {
        console.log('Git watch error:', e.message);
      }

    }, 60000);
  }
};
