'use strict';

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '../lib/grupooficial.json');

module.exports = {
  commands: ['grupobot'],

  async execute({ sock, msg, remoteJid }) {

    if (!fs.existsSync(FILE)) {
      return sock.sendMessage(
        remoteJid,
        {
          text: '❌ No hay grupo oficial configurado.'
        },
        { quoted: msg }
      );
    }

    const data = JSON.parse(fs.readFileSync(FILE));

    try {

      const code = await sock.groupInviteCode(data.id);

      await sock.sendMessage(
        remoteJid,
        {
          text:
`🌌 *Grupo Oficial del Bot*

🔗 https://chat.whatsapp.com/${code}`
        },
        { quoted: msg }
      );

    } catch {

      await sock.sendMessage(
        remoteJid,
        {
          text: '❌ No pude obtener el enlace del grupo oficial.'
        },
        { quoted: msg }
      );

    }
  }
};
