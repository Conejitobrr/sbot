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

    // Lista MEGA gigante de respuestas cómicas (¡Más de 70 frases!)
    const respuestasComicas = [
      // Clásicas y exageradas
      `🥵 ¡${user} se acaba de coger a ${target}! y le hizo ver estrellitas. 🌟`,
      `🔥 ${user} y ${target} se fueron a lo oscurito... a jugar al teto. 😏`,
      `🚑 Llamen a los bomberos, ${user} le está prendiendo fuego a ${target} en la cama. 🚒`,
      `🌙 ${target} pensó que iban a ver Netflix, pero ${user} le dio puro chill y del bueno. 🍿`,
      `💒 ${target} va a tener que rezar 3 Padres Nuestros después de las cochinadas que le hizo ${user}. 🙏`,
      `🌪️ ${user} revolcó a ${target} como lavadora en ciclo rápido. 🌀`,
      `🐰 ${user} y ${target} están dándole como conejos en primavera. 🐇`,
      `🥵 ${target} quedó bizco/a después de la cogida que le pegó ${user}. 🤪`,
      `🎮 ${user} le dio a ${target} su buena partida de joystick. 🕹️`,
      `💦 ${user} dejó a ${target} más sudado/a que testigo falso. 😅`,
      `🛏️ ${user} y ${target} rompieron los resortes del colchón. ¡Pobre cama! 💥`,
      `🐶 ${user} puso a ${target} a ladrar toda la noche. 🐕`,
      `🎸 ${user} tocó a ${target} como si fuera un solo de guitarra de rock. 🤘`,
      `💦 ${target} necesitaba hidratarse y ${user} le dio su buen suero. 🧃`,
      `🥊 ${user} noqueó a ${target} en el primer asalto del catre. 🥇`,
      `🐯 ${user} sacó su lado salvaje y devoró a ${target}. 🥩`,
      `🥵 ${user} le quitó el frío a ${target} a punta de arrimones. 🥶➡️🥵`,
      `🎢 ${target} se subió a la montaña rusa de ${user} y salió mareado/a. 🤢`,
      `🐒 ${user} puso a ${target} a trepar árboles. 🌴`,
      `👻 ${user} le sacó los sustos a ${target} a puros sentones. 🎃`,
      `🩺 ${user} le hizo un chequeo médico completo a ${target} en la cama. 👨‍⚕️`,
      `🛸 ${user} mandó a ${target} a la luna y sin cohete espacial. 🚀`,
      `🦀 ${user} agarró a ${target} como jaiba y no lo/la soltó. 🏖️`,
      `🎈 ${user} le infló el globo a ${target} hasta que reventó. 💥`,
      `🎭 ${user} y ${target} jugaron a los médicos y enfermeras y terminaron sudando. 🏥`,
      `🥵 ${target} terminó pidiendo esquina después del round que le dio ${user}. 🏁`,

      // Mecánica, construcción y tecnología
      `🛠️ ${user} le dio a ${target} su buena aceitada de motor. 🚗💨`,
      `🔋 ${user} le recargó las baterías a ${target} con su cable USB. 🔌`,
      `🔨 ${user} clavó a ${target} como un cuadro nuevo en la pared. 🖼️`,
      `🚜 ${user} le pasó el tractor por encima a ${target}. 🌾`,
      `🖥️ ${user} le formateó el disco duro a ${target} a puro teclazo. ⌨️`,
      `🎨 ${user} le dio unas buenas pinceladas a ${target} hasta dejarle la fachada como nueva. 🖌️`,
      `🪚 ${user} cortó madera con ${target} toda la noche, ¡puro serrucho! 🪵`,
      `🧩 ${user} encontró la pieza que le faltaba y encajó perfecto en ${target}. 😌`,
      `🚪 ${user} le aceitó las bisagras a ${target} para que deje de rechinar. 🛢️`,
      `🔑 ${user} encontró la cerradura de ${target} y le metió la llave maestra. 🚪`,
      `🔌 ${user} conectó a ${target} en 220v y le dio tremendo cortocircuito. ⚡`,

      // Comida y cocina
      `🌭 ${user} le invitó un pancho a ${target} y se lo comió enterito. 😹`,
      `🌮 ${user} se comió el taco de ${target} con mucho picante. 🌶️`,
      `🍩 ${user} le rellenó la dona a ${target} con mucha crema. 🥯`,
      `🍦 ${user} le dio a ${target} su buen cono de helado hasta que se derritió. 👅`,
      `🥖 ${user} le amasó bien el pan a ${target} para que suba la masa. 🍞`,
      `👨‍🍳 ${user} preparó a ${target} a fuego lento y se la/lo comió con postre incluido. 🍰`,
      `🌶️ ${user} le echó tanto picante al plato de ${target} que lo/la dejó escupiendo fuego. 🐉`,
      `🍕 ${user} se comió la última porción de la pizza de ${target} sin pedir permiso. 😋`,
      `🍳 ${user} estrelló los huevos en la sartén de ${target}. ¡Qué desayuno! 🥓`,

      // Naturaleza, limpieza y otras locuras
      `🧹 ${user} le barrió el patio trasero a ${target} bien barridito. 😝`,
      `🧼 ${user} le sacudió el polvo a ${target} hasta dejarlo/la rechinando de limpio. ✨`,
      `🏋️‍♂️ ${user} usó a ${target} para hacer su rutina de cardio intenso. ¡A sudar! 💦`,
      `🎣 ${user} tiró la caña y pescó a ${target}... ¡tremenda ensartada! 🐟`,
      `🏇 ${user} domó a ${target} como a caballo salvaje, ¡arre! 🤠`,
      `🎺 ${user} le afinó el instrumento a ${target} a puros soplidos. 🎶`,
      `🚢 ${user} atracó su barco en el puerto de ${target} y no piensa zarpar pronto. ⚓`,
      `🪡 ${user} le cosió el roto a ${target} con aguja de las gruesas. 🧵`,
      `🎳 ${user} le hizo una chuza a ${target}, ¡derribó todos los pinos de un solo tiro! 💥`,
      `🏹 ${user} apuntó y le dio justo en el blanco a ${target}. ¡Flechazo directo! 🎯`,
      `🕷️ ${user} envolvió a ${target} en su telaraña y se la/lo cenó completito. 🕸️`,
      `🪄 ${user} le hizo un truco de magia a ${target} y le hizo desaparecer hasta el aliento. 🎩`,
      `🐝 ${user} le picó a ${target} y le dejó todo hinchado... el orgullo. 🍯`,
      `🚜 ${user} le aró todo el campo a ${target} y le dejó la semilla plantada. 🌱`,
      `🚿 ${user} y ${target} se metieron a "bañar" juntos pero gastaron toda el agua sin usar jabón. 🧼`,
      `📸 ${user} le sacó las mejores poses a ${target} en su estudio privado. 🎞️`,
      `🛒 ${user} pasó a ${target} por la caja registradora y se llevó hasta el cambio. 🧾`,
      `🌋 ${user} hizo que el volcán de ${target} hiciera erupción. ¡Cuidado con la lava! 🌋`,
      `⏳ ${user} le dio a ${target} por horas hasta que se acabó la arena del reloj. 🕰️`,
      `🚲 ${user} se montó en ${target} y le dio pedaleo hasta quedarse sin frenos. 🚵‍♂️`,
      `✂️ ${user} y ${target} jugaron a las tijeretas, ¡cuidado que cortan! ✂️`,
      `🎪 ${user} hizo de malabarista con ${target} en el circo de la cama. 🤹‍♀️`,
      `🧯 ${user} le apagó el fuego a ${target} pero a punta de manguerazos. 💦`
    ];

    // Magia para elegir uno al azar
    const textoAleatorio = respuestasComicas[Math.floor(Math.random() * respuestasComicas.length)];

    return sock.sendMessage(remoteJid, {
      text: textoAleatorio,
      mentions: [sender, mentioned]
    }, { quoted: msg });
  }
};
