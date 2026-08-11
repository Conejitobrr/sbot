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
        text: `❌ ¡Epa! ¿Con quién te vas a ir a lo oscurito? Debes mencionar a alguien.\n\nEjemplo:\n.coger @usuario`
      }, { quoted: msg });
    }

    const user = `@${sender.split('@')[0]}`;
    const target = `@${mentioned.split('@')[0]}`;

    // Lista de respuestas graciosas y variadas
    const respuestas = [
      `🥵 ${user} se acaba de coger a${target} y le hizo gritar de todo menos su nombre. 🥵`,
      `🔥 ${user} invitó a ${target} a "ver Netflix", pero terminaron rompiendo la cama. 🛏️💥`,
      `🚑 Llamen a una ambulancia, porque ${user} acaba de dejar a${target} sin caminar por una semana. 💦`,
      `😏 ${user} y${target} se fueron a lo oscurito... y no precisamente a jugar a las escondidas. 🌚`,
      `🛠️ ${user} le dio a${target} como a cajón que no cierra. ¡Pobre pelvis! 😹`,
      `🌪️ ${user} agarró a ${target} y le dio contra el muro, contra la mesa y contra el piso. ¡Calma, fiera! 🐯`,
      `💦 ${target} pensó que era un juego, pero ${user} le dio la arrastrada de su vida. 🥵`,
      `⛪ ${target} va a tener que ir a confesarse después de las cochinadas que le hizo ${user}. 😈`,
      `🔌 ${user} enchufó a ${target} y le reinició hasta el Windows. ¡Qué salvaje! 🤣`
    ];

    // Selecciona una frase al azar de la lista
    const textoAleatorio = respuestas[Math.floor(Math.random() * respuestas.length)];

    return sock.sendMessage(remoteJid, {
      text: textoAleatorio,
      mentions: [sender, mentioned]
    }, { quoted: msg });
  }
};
