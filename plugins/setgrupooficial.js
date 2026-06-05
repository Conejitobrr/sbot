'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config');

const FILE = path.join(__dirname, '../lib/grupooficial.json');

function isOwner(sender = '') {
  sender = sender.replace(/[^0-9]/g, '');

  return config.owner.some(o =>
    String(o).replace(/[^0-9]/g, '') === sender
  );
}

module.exports = {
  commands: ['setgrupooficial'],

  async execute({ sock, msg, remoteJid, sender }) {

    if (!isOwner(sender)) {
      return sock.sendMessage(
        remoteJid,
        { text: '❌ Solo los owners pueden usar este comando.' },
        { quoted: msg }
      );
    }

    fs.writeFileSync(
      FILE,
      JSON.stringify({
        id: remoteJid
      }, null, 2)
    );

    await sock.sendMessage(
      remoteJid,
      {
        text: `✅ Este grupo fue configurado como grupo oficial del bot.`
      },
      { quoted: msg }
    );
  }
};
