'use strict';

const fs = require('fs');
const path = require('path');

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

    // 1. Preparamos las opciones base del mensaje
    let messageOptions = {
      caption: texto,
      mentions: [mentioned]
    };

    try {
      // 2. Intentamos obtener la foto real
      const pfpUrl = await sock.profilePictureUrl(mentioned, 'image');
      messageOptions.image = { url: pfpUrl };
    } catch {
      // 3. Si no tiene foto o es privada, usamos la local (Cero errores 429)
      const fallbackPath = path.join(process.cwd(), 'assets', 'Sinperfil.jpg');
      
      if (fs.existsSync(fallbackPath)) {
        // Lee la imagen directamente desde los archivos de tu bot
        messageOptions.image = fs.readFileSync(fallbackPath);
      } else {
        // Si por accidente borras el archivo Sinperfil.jpg, usa el link de emergencia
        messageOptions.image = { url: 'https://i.imgur.com/JP3QZ7B.jpeg' };
      }
    }

    try {
      // 4. Enviamos el mensaje final
      await sock.sendMessage(remoteJid, messageOptions, { quoted: msg });
    } catch (error) {
      console.log('❌ Error enviando felizcumple:', error);
      // Si por alguna razón extrema todo lo multimedia falla, envía al menos el texto
      await sock.sendMessage(remoteJid, { text: texto, mentions: [mentioned] }, { quoted: msg });
    }
  }
};
