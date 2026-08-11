'use strict';

// ¡NUEVA FUNCIÓN MEJORADA!
function obtenerObjetivo(msg) {
  // 1. Intenta buscar si mencionaste a alguien con el @
  let menciones = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

  // 2. Si WhatsApp falló en la mención, verifica si el usuario RESPONDÍO a un mensaje
  if (menciones.length === 0) {
    const usuarioCitado = msg.message?.extendedTextMessage?.contextInfo?.participant;
    if (usuarioCitado) {
      menciones = [usuarioCitado]; // Captura al dueño del mensaje que respondiste
    }
  }

  return menciones;
}

module.exports = {
  commands: ['coger'],

  async execute({ sock, remoteJid, sender, msg }) {
    // Usamos la nueva función para buscar a la víctima
    const targets = obtenerObjetivo(msg);
    const mentioned = targets[0];

    if (!mentioned) {
      return sock.sendMessage(remoteJid, {
        text: `❌ ¡Epa, fiera! ¿A quién te vas a llevar a lo oscurito? \n\nDebes mencionar a alguien (@usuario) o **responder a uno de sus mensajes** con el comando.`
      }, { quoted: msg });
    }

    const user = `@${sender.split('@')[0]}`;
    const target = `@${mentioned.split('@')[0]}`;

    // Lista gigante de respuestas cómicas
    const respuestasComicas = [
      `🥵 ¡${user} se acaba de coger a ${target}! y le hizo ver estrellitas. 🌟`,
      `🔥 ${user} y ${target} se fueron a lo oscurito... a jugar al teto. 😏`,
      `🚑 Llamen a los bomberos, ${user} le está prendiendo fuego a ${target} en la cama. 🚒`,
      `🛠️ ${user} le dio a ${target} su buena aceitada de motor. 🚗💨`,
      `🌙 ${target} pensó que iban a ver Netflix, pero ${user} le dio puro chill y del bueno. 🍿`,
      `💒 ${target} va a tener que rezar 3 Padres Nuestros después de las cochinadas que le hizo ${user}. 🙏`,
      `🔋 ${user} le recargó las baterías a ${target} con su cable USB. 🔌`,
      `🌪️ ${user} revolcó a ${target} como lavadora en ciclo rápido. 🌀`,
      `🌭 ${user} le invitó un pancho a ${target} y se lo comió enterito. 😹`,
      `🐰 ${user} y ${target} están dándole como conejos en primavera. 🐇`,
      `🥵 ${target} quedó bizco/a después de la cogida que le pegó ${user}. 🤪`,
      `🎮 ${user} le dio a ${target} su buena partida de joystick. 🕹️`,
      `💦 ${user} dejó a ${target} más sudado/a que testigo falso. 😅`,
      `🔨 ${user} clavó a ${target} como un cuadro nuevo en la pared. 🖼️`,
      `🛏️ ${user} y ${target} rompieron los resortes del colchón. ¡Pobre cama! 💥`,
      `🌮 ${user} se comió el taco de ${target} con mucho picante. 🌶️`,
      `🐶 ${user} puso a ${target} a ladrar toda la noche. 🐕`,
      `🧹 ${user} le barrió el patio trasero a ${target} bien barridito. 😝`,
      `🎸 ${user} tocó a ${target} como si fuera un solo de guitarra de rock. 🤘`,
      `💦 ${target} necesitaba hidratarse y ${user} le dio su buen suero. 🧃`,
      `🥊 ${user} noqueó a ${target} en el primer asalto del catre. 🥇`,
      `🐯 ${user} sacó su lado salvaje y devoró a ${target}. 🥩`,
      `🥵 ${user} le quitó el frío a ${target} a punta de arrimones. 🥶➡️🥵`,
      `🎢 ${target} se subió a la montaña rusa de ${user} y salió mareado/a. 🤢`,
      `🚜 ${user} le pasó el tractor por encima a ${target}. 🌾`,
      `🐒 ${user} puso a ${target} a trepar árboles. 🌴`,
      `🍩 ${user} le rellenó la dona a ${target} con mucha crema. 🥯`,
      `👻 ${user} le sacó los sustos a ${target} a puros sentones. 🎃`,
      `🩺 ${user} le hizo un chequeo médico completo a ${target} en la cama. 👨‍⚕️`,
      `🛸 ${user} mandó a ${target} a la luna y sin cohete espacial. 🚀`,
      `🦀 ${user} agarró a ${target} como jaiba y no lo/la soltó. 🏖️`,
      `🍦 ${user} le dio a ${target} su buen cono de helado hasta que se derritió. 👅`,
      `🎈 ${user} le infló el globo a ${target} hasta que reventó. 💥`,
      `🎭 ${user} y ${target} jugaron a los médicos y enfermeras y terminaron sudando. 🏥`,
      `🥵 ${target} terminó pidiendo esquina después del round que le dio ${user}. 🏁`
    ];

    const textoAleatorio = respuestasComicas[Math.floor(Math.random() * respuestasComicas.length)];

    return sock.sendMessage(remoteJid, {
      text: textoAleatorio,
      mentions: [sender, mentioned]
    }, { quoted: msg });
  }
};
