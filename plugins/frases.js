'use strict';

module.exports = {
  commands: ['consejo', 'fraseromantica', 'historiaromantica'],

  async execute(ctx) {
    const { sock, remoteJid, msg, command } = ctx;

    // 📌 CONSEJO
    if (command === 'consejo') {
      const texto = consejos[Math.floor(Math.random() * consejos.length)];

      return sock.sendMessage(remoteJid, {
        text:
`╭─◆────◈⚘◈─────◆─╮

🌟 *Consejo del día* 🌟

❥ ${texto}

╰─◆────◈⚘◈─────◆─╯`
      }, { quoted: msg });
    }

    // 💖 FRASE ROMÁNTICA
    if (command === 'fraseromantica') {
      const texto = frases[Math.floor(Math.random() * frases.length)];

      return sock.sendMessage(remoteJid, {
        text:
`╭─◆────◈⚘◈─────◆─╮

💖 *Frase romántica* 💖

❥ ${texto}

╰─◆────◈⚘◈─────◆─╯`
      }, { quoted: msg });
    }

    // 📖 HISTORIA (SIN API → MÁS ESTABLE)
    if (command === 'historiaromantica') {
      const historia = historias[Math.floor(Math.random() * historias.length)];

      return sock.sendMessage(remoteJid, {
        text:
`╭─◆────◈⚘◈─────◆─╮

📖 *Historia romántica*

${historia}

╰─◆────◈⚘◈─────◆─╯`
      }, { quoted: msg });
    }
  }
};

// 💖 FRASES (AMPLIADO)
const frases = [
  'Eres la razón por la que sonrío incluso en los días difíciles.',
  'Tu amor es mi lugar favorito en todo el universo.',
  'Contigo aprendí que amar es vivir de verdad.',
  'Tus abrazos son mi refugio seguro.',
  'Eres el sueño que no quiero despertar jamás.',
  'Cada momento contigo es un regalo eterno.',
  'Tu sonrisa ilumina incluso mis días más oscuros.',
  'No necesito más, porque contigo lo tengo todo.',
  'Eres mi paz en medio del caos.',
  'Tu amor es mi mayor fortaleza.',
  'Amarte es lo más bonito que me ha pasado.',
  'Eres la casualidad más hermosa de mi vida.',
  'Tus ojos tienen la magia que mi alma buscaba.',
  'Si tuviera que elegir de nuevo, siempre te elegiría a ti.',
  'Eres mi hoy, mi mañana y mi siempre.',
  'Tu amor hace que todo tenga sentido.',
  'Eres la historia que quiero contar toda mi vida.',
  'No sabía lo que era amar hasta que llegaste tú.',
  'Eres mi coincidencia favorita.',
  'Amarte es mi decisión favorita cada día.'
];

// 🌟 CONSEJOS (AMPLIADO)
const consejos = [
  'No te rindas, incluso cuando todo parezca difícil.',
  'Cuida tu mente tanto como cuidas tu cuerpo.',
  'Rodéate de personas que sumen, no que resten.',
  'Aprende a decir no sin sentir culpa.',
  'El tiempo es lo más valioso que tienes, úsalo bien.',
  'No compares tu progreso con el de otros.',
  'Equivocarte también es avanzar.',
  'Confía en tu proceso, aunque sea lento.',
  'Haz hoy algo que tu futuro yo agradecerá.',
  'No todo necesita una respuesta inmediata.',
  'Escucha más de lo que hablas.',
  'La disciplina supera a la motivación.',
  'Valora lo que tienes antes de que falte.',
  'No te tomes todo personal.',
  'Aprende a soltar lo que no te hace bien.',
  'Cuida tus hábitos, ellos construyen tu vida.',
  'Haz pausas, descansar también es avanzar.',
  'No vivas solo para trabajar.',
  'Tu paz vale más que cualquier discusión.',
  'Sé constante, no perfecto.'
];

// 📖 HISTORIAS (SIN API)
const historias = [
`🫐 Título: El amor inesperado
🍃 Autor: Sirius

Se conocieron por casualidad, pero se quedaron por decisión.
Cada conversación los acercaba más, hasta que un día entendieron
que ya no podían imaginar su vida sin el otro.`,

`🫐 Título: Dos almas
🍃 Autor: Sirius

No sabían cómo ni cuándo, pero sus caminos se cruzaron.
Y desde ese momento, todo tuvo sentido.
Porque hay amores que no se explican, solo se sienten.`,

`🫐 Título: Siempre tú
🍃 Autor: Sirius

Podían pasar días, meses o años…
pero al final siempre se encontraban.
Porque cuando el amor es real, nunca se pierde.`,

`🫐 Título: Destino
🍃 Autor: Sirius

Dicen que el destino no existe,
pero ellos demostraron lo contrario.
Porque entre millones de personas,
se eligieron una y otra vez.`,

`🫐 Título: Más que palabras
🍃 Autor: Sirius

No hacían falta promesas,
ni juramentos eternos.
Porque en cada mirada
ya se decían todo.`
];
