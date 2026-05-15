'use strict';

function getMentioned(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
}

module.exports = {
  commands: ['coger', 'follar'],

  async execute({ sock, remoteJid, sender, msg }) {
    const mentioned = getMentioned(msg)[0];

    if (!mentioned) {
      return sock.sendMessage(remoteJid, {
        text:
`❌ Debes mencionar a alguien.

Ejemplo:
.coger @usuario`
      }, { quoted: msg });
    }

    const user = `@${sender.split('@')[0]}`;
    const target = `@${mentioned.split('@')[0]}`;

    const texto =
`🥵 ${user} se acaba de coger a ${target}! y le hizo gritar como una maldita puta🥵

${user} y ${target} se fueron a lo oscurito 😏

${target}, te han cogido 😹`;

    return sock.sendMessage(remoteJid, {
      text: texto,
      mentions: [sender, mentioned]
    }, { quoted: msg });
  }
};
