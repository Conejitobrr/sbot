'use strict';

function getMentioned(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
}

module.exports = {
  commands: ['follar'],

  async execute({ sock, remoteJid, sender, msg }) {
    const mentioned = getMentioned(msg)[0];

    if (!mentioned) {
      return sock.sendMessage(remoteJid, {
        text: `❌ Tienes que mencionar a la perra o el perro que te vas a follar.\n\nEjemplo:\n.follar @usuario`
      }, { quoted: msg });
    }

    const user = `@${sender.split('@')[0]}`;
    const target = `@${mentioned.split('@')[0]}`;

    const respuestasGrotescas = [
      `🥵 ${user} se acaba de follar a ${target} y le hizo gritar como una maldita puta. 🥵`,
      `💦 ${user} agarró a ${target} en cuatro y le dio tan duro que le desarmó la cadera. 😈`,
      `🐕 ${user} puso a ${target} como perrito y le dio hasta sacarle espuma por la boca. 🥵`,
      `🍆 ${user} le metió a ${target} hasta lo que no tiene nombre. ¡Qué maldita reventada le pegó! 💥`,
      `🛏️ ${target} se creía muy salsa hasta que ${user} se la/lo folló y le dejó el orto como bandera de Japón. 🌸`,
      `🍼 ${user} ordeñó a ${target} como vaca lechera, le sacó hasta la última gota. 💦`,
      `🔨 ${user} agarró a ${target} y le dio contra el muro como a rata en balde, ¡sin piedad! 🐀`,
      `😈 ${user} se folló a ${target} tan salvaje que los vecinos llamaron a la policía. 🚓`,
      `🌭 ${target} terminó con la boca abierta, babeando y las piernas temblando después de la cogida que le dio ${user}. 💦`,
      `🥵 ${user} le dio a ${target} una arrastrada de aquellas, le dejó el hoyo pidiendo auxilio y clemencia. 😹`,
      `🚂 ${user} le pasó por encima a ${target} como tren sin frenos. ¡Gemía como perra en celo! 🐶`,
      `💥 ${user} le rompió el culo a ${target} de una manera tan brutal que no se va a poder sentar en un mes entero. 🪑`,
      `🥩 ${user} le rellenó el pavo a ${target} con tanta fuerza que le salieron los ojos en blanco. 🦃`,
      `💦 ${target} quedó con las patas al aire y los ojos desorbitados después de que ${user} se la/lo cogiera sin asco. 🤤`,
      `🌪️ ${user} desbarató a ${target} en la cama, le dio por todos los huecos posibles hasta dejarla/lo seco. 💀`,
      `🍑 ${user} le agarró las nalgas a ${target} y se las dejó rojas de tanto darle como a cajón que no cierra. 🔥`,
      `🔥 ${user} le dio a ${target} una cogida tan asquerosa y rica que ${target} terminó rogando por más. 😈`,
      `🥛 ${user} dejó a ${target} como panadero, con toda la cara llena de leche. 💦`,
      `🥵 ${user} enterró a ${target} en el colchón a puros sentones y le sacó hasta los malos pensamientos. 🧠`,
      `💦 A ${target} le temblaban las rodillas después de que ${user} la/lo usara de putita personal toda la noche. 🧸`,
      `🍆 ${user} le reventó la garganta a ${target} a puros vergazos. ¡Qué maldita barbaridad! 🥵`,
      `🤬 ${user} agarró del pelo a ${target} y se la/lo folló tan fuerte que la/lo dejó medio pendejo/a. 🤯`,
      `🧟 ${user} le sacó el alma a ${target} a punta de pijazos, la/lo dejó como zombie en la cama. 🧟‍♀️`,
      `🚽 ${target} va a tener que cagar de pie después de la destrozada de culo que le metió ${user}. 💩`,
      `⛓️ ${user} amarró a ${target} y la/lo usó como su esclava sexual hasta dejarle los fluidos secos. ⛓️`,
      `🌭 ${user} le atragantó toda la macana a ${target} hasta dejarla/lo sin oxígeno. 😵`,
      `🕳️ ${user} le taladró el hoyo a ${target} con tanta furia que casi llega al centro de la tierra. 🌍`,
      `🐽 ${user} puso a ${target} a tragar fluidos como cerda/o en celo y la/lo hizo rogar por la última gota. 💦`,
      `🐕 ${target} terminó gateando en pelotas porque ${user} le reventó la espalda a sentones. 🔙`,
      `🍼 ${user} le dejó el vientre a ${target} rebasando de tanta leche que le bombeó adentro. 🍼`,
      `☠️ ${user} se folló a ${target} con tanto morbo que casi lo/la manda a conocer a San Pedro. 🪦`,
      `😈 ${user} le dio a ${target} por donde no entra el sol y la/lo hizo llorar del puto placer. 🥵`,
      `🥵 ${user} escupió, ahorcó y se cogió a ${target} con pura maldad, ¡y a esa perra le encantó! 😈`,
      `💦 ${user} le metió a ${target} una ensartada que le reinició el Windows a punta de mecos. 💻`,
      `🥩 ${user} dejó el culo de ${target} más abierto que las puertas de un supermercado. 🚪💨`
    ];

    const textoAleatorio = respuestasGrotescas[Math.floor(Math.random() * respuestasGrotescas.length)];

    return sock.sendMessage(remoteJid, {
      text: textoAleatorio,
      mentions: [sender, mentioned]
    }, { quoted: msg });
  }
};
