'use strict';

const axios = require('axios');

let previousCommitSHA = '';
let previousMessage = '';

const owner = 'Conejitobrr';
const repo = 'siriusbot';

let intervalStarted = false;

module.exports = {
  commands: ['actualizar', 'actualizacion'],

  async execute(ctx) {
    const { sock, msg, remoteJid } = ctx;

    await sock.sendMessage(remoteJid, {
      text: '🔄 Iniciando monitoreo del repositorio...'
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
        const url = commit.html_url;

        if (sha !== previousCommitSHA || message !== previousMessage) {
          previousCommitSHA = sha;
          previousMessage = message;

          await sock.sendMessage(remoteJid, {
            text:
`🚀 *Actualización detectada*

📦 Repo: ${repo}
📝 Commit: ${message}
🔗 Link: ${url}`
          }, { quoted: msg });
        }

      } catch (e) {
        console.log('Git watcher error:', e.message);
      }

    }, 60000);
  }
};
