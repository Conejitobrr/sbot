'use strict';

function getMentioned(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
}

module.exports = {
  commands: ['felizcumple'],

  async execute({ sock, remoteJid, sender, msg, args }) {

    const mentioned = getMentioned(msg)[0];

    if (!mentioned) {
      return sock.sendMessage(remoteJid, {
        text:
`❌ Debes mencionar a tu novia.

Ejemplo:
.felizcumple @usuario`
      }, { quoted: msg });
    }

    let pfp;

    try {
      pfp = await sock.profilePictureUrl(mentioned, 'image');
    } catch {
      pfp = 'https://i.imgur.com/JP3QZ7B.jpeg';
    }

    const tag = `@${mentioned.split('@')[0]}`;

    const texto =
`🎂✨ *FELIZ CUMPLEAÑOS* ✨🎂

🎉 Hoy cumple años la niña más hermosa 😻💖

💌 Feliz cumpleaños ${tag}

Espero que tengas un día increíble,
lleno de amor, regalos y muchísima felicidad ✨

💖 Que nunca te falten motivos para sonreír
🌟 Que todos tus sueños se hagan realidad
🎁 Y que este nuevo año de vida sea muchísimo mejor

Te mereces todo lo bonito del mundo 😻

🎂💞✨`;

    await sock.sendMessage(remoteJid, {
      image: { url: pfp },
      caption: texto,
      mentions: [mentioned]
    }, { quoted: msg });
  }
};
