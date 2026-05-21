'use strict';

module.exports = {
  commands: ['felizcumple'],

  async execute({ sock, remoteJid, sender, msg, args }) {

    const nombre = args.join(' ').trim() || 'Mi amor 💖';

    let pfp;

    try {
      pfp = await sock.profilePictureUrl(sender, 'image');
    } catch {
      pfp = 'https://i.imgur.com/JP3QZ7B.jpeg';
    }

    const texto =
`🎂✨ *FELIZ CUMPLEAÑOS* ✨🎂

🎉 Hoy cumple años la niña más hermosa 😻💖

💌 *${nombre}*, espero que tengas un día increíble,
lleno de amor, regalos, felicidad y muchísimas sonrisas ✨

Gracias por existir,
por hacerme feliz
y por ser alguien tan especial 💕

💖 Que nunca te falten motivos para sonreír
🌟 Que todos tus sueños se hagan realidad
🎁 Y que este nuevo año de vida sea muchísimo mejor

Te mereces todo lo bonito del mundo 😻

🎂💞✨`;

    await sock.sendMessage(remoteJid, {
      image: { url: pfp },
      caption: texto
    }, { quoted: msg });
  }
};
