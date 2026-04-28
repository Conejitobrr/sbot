'use strict';

module.exports = {
  commands: ['consejo', 'fraseromantica', 'frase', 'historiaromantica'],

  async execute(ctx) {
    const { sock, remoteJid, msg, command, sender } = ctx;

    const mention = [sender];
    const authorTag = '@' + sender.split('@')[0];

    // 🌟 CONSEJO
    if (command === 'consejo') {
      const texto = consejos[Math.floor(Math.random() * consejos.length)];

      return sock.sendMessage(remoteJid, {
        text:
`╭─◆────◈⚘◈─────◆─╮

🌟 *Consejo del día* 🌟

❥ ${texto}

╰─◆────◈⚘◈─────◆─╯`,
        mentions: mention
      }, { quoted: msg });
    }

    // 💖 FRASE
    if (command === 'fraseromantica' || command === 'frase') {
      const texto = frases[Math.floor(Math.random() * frases.length)];

      return sock.sendMessage(remoteJid, {
        text:
`╭─◆────◈⚘◈─────◆─╮

💖 *Frase romántica* 💖

❥ ${texto}

╰─◆────◈⚘◈─────◆─╯`,
        mentions: mention
      }, { quoted: msg });
    }

    // 📖 HISTORIA
    if (command === 'historiaromantica') {
      const historia = historias[Math.floor(Math.random() * historias.length)];

      return sock.sendMessage(remoteJid, {
        text:
`╭─◆────◈⚘◈─────◆─╮

📖 *Historia romántica*

🫐 Autor: ${authorTag}

${historia}

╰─◆────◈⚘◈─────◆─╯`,
        mentions: mention
      }, { quoted: msg });
    }
  }
};

// 💖 100 FRASES REALES
const frases = [
'Eres la casualidad más bonita que llegó a mi vida.',
'Tu sonrisa es mi lugar favorito.',
'Contigo todo se siente diferente, mejor.',
'Eres el motivo de mis mejores pensamientos.',
'Tu amor es lo único que necesito para estar bien.',
'Cada momento contigo vale más que mil días sin ti.',
'Eres la paz que tanto buscaba.',
'Tu mirada tiene algo que me atrapa.',
'Eres lo mejor que me pasó sin buscarlo.',
'Tu voz calma cualquier tormenta.',
'Eres mi persona favorita en todo.',
'Contigo aprendí lo que es amar de verdad.',
'Eres mi lugar seguro.',
'Tu amor me hace sentir invencible.',
'Eres el pensamiento que siempre vuelve.',
'No sabía lo que era amor hasta que llegaste.',
'Tu presencia cambia todo.',
'Eres mi mejor historia.',
'Tu amor me completa.',
'Eres la razón de mi sonrisa diaria.',
'Contigo todo vale la pena.',
'Eres mi felicidad en persona.',
'Tu amor es mi refugio.',
'Eres lo que siempre soñé.',
'Tu forma de ser me encanta.',
'Eres mi coincidencia favorita.',
'Tu cariño es mi mayor tesoro.',
'Eres la calma en mi caos.',
'Tu amor es mi mayor suerte.',
'Eres mi mejor elección.',
'Tu presencia ilumina mi día.',
'Eres el mejor regalo de la vida.',
'Contigo todo es más bonito.',
'Eres la razón por la que creo en el amor.',
'Tu amor me da fuerzas.',
'Eres mi pensamiento constante.',
'Contigo todo tiene sentido.',
'Eres mi persona ideal.',
'Tu amor es único.',
'Eres la mejor parte de mi día.',
'Tu cariño es lo que más valoro.',
'Eres lo que siempre quise.',
'Contigo soy mejor.',
'Eres mi inspiración.',
'Tu amor es mi felicidad.',
'Eres mi mejor compañía.',
'Tu presencia es suficiente.',
'Eres mi razón favorita.',
'Contigo todo mejora.',
'Eres lo más bonito que tengo.',
'Eres mi tranquilidad.',
'Tu amor es mi motor.',
'Eres mi alegría diaria.',
'Contigo todo fluye.',
'Eres mi motivación.',
'Tu amor es especial.',
'Eres mi paz.',
'Contigo soy feliz.',
'Eres mi todo.',
'Tu amor es perfecto.',
'Eres lo mejor.',
'Eres mi sueño.',
'Eres mi vida.',
'Eres mi razón.',
'Eres mi amor.',
'Eres mi destino.',
'Eres mi ilusión.',
'Eres mi alegría.',
'Eres mi calma.',
'Eres mi magia.',
'Eres mi luz.',
'Eres mi cielo.',
'Eres mi mundo.',
'Eres mi sol.',
'Eres mi luna.',
'Eres mi estrella.',
'Eres mi esperanza.',
'Eres mi fuerza.',
'Eres mi razón de ser.',
'Eres mi felicidad eterna.',
'Eres lo más importante.',
'Eres mi prioridad.',
'Eres mi todo siempre.',
'Eres mi complemento.',
'Eres mi corazón.',
'Eres mi paz interior.',
'Eres mi mejor momento.',
'Eres mi compañía perfecta.',
'Eres mi lugar favorito.',
'Eres mi mejor decisión.',
'Eres mi historia favorita.',
'Eres mi amor infinito.',
'Eres mi felicidad constante.',
'Eres mi mayor deseo.',
'Eres mi razón de vivir.',
'Eres mi amor eterno.'
];

// 🌟 100 CONSEJOS REALES
const consejos = [
'Confía en ti mismo incluso cuando nadie más lo haga.',
'No dejes para mañana lo que puedes hacer hoy.',
'Aprende de cada error que cometas.',
'Rodéate de personas que te sumen.',
'No tengas miedo de empezar de nuevo.',
'Escucha más de lo que hablas.',
'Cuida tu salud mental.',
'Descansa cuando lo necesites.',
'No te compares con los demás.',
'Sé constante en lo que haces.',
'Haz lo que te haga feliz.',
'No dependas de la aprobación de otros.',
'Valora tu tiempo.',
'Aprende a decir no.',
'No te rindas fácilmente.',
'Mantente enfocado en tus metas.',
'Confía en el proceso.',
'Aprende a soltar.',
'Disfruta el presente.',
'No vivas del pasado.',
'Sé agradecido.',
'Aprende algo nuevo cada día.',
'No temas al fracaso.',
'Cuida tus emociones.',
'Sé disciplinado.',
'Ten paciencia.',
'Escucha tu intuición.',
'Cuida tu entorno.',
'Respeta a los demás.',
'Valora lo simple.',
'No te sobrecargues.',
'Aprende a perdonar.',
'Evita la negatividad.',
'Sé auténtico.',
'No pierdas tu esencia.',
'Actúa con intención.',
'Cuida tus hábitos.',
'Sé organizado.',
'Aprende a adaptarte.',
'No te detengas.',
'Sé humilde.',
'Aprende a esperar.',
'Disfruta los pequeños logros.',
'No te sabotees.',
'Sé fuerte mentalmente.',
'Busca soluciones.',
'Evita excusas.',
'Sé responsable.',
'Cuida tus relaciones.',
'Sé agradecido siempre.',
'Aprende a escuchar.',
'Cuida tu energía.',
'Sé valiente.',
'No te limites.',
'Sé positivo.',
'Confía en tu camino.',
'Sé persistente.',
'Aprende a priorizar.',
'Cuida tu bienestar.',
'No ignores tus emociones.',
'Sé constante.',
'Aprende a descansar.',
'Cuida tu tiempo.',
'Sé consciente.',
'Aprende a crecer.',
'No te conformes.',
'Sé mejor cada día.',
'Cuida tu mente.',
'Sé disciplinado.',
'Aprende a mejorar.',
'No te rindas nunca.',
'Sé fuerte.',
'Confía en ti.',
'Sé feliz.',
'Aprende a vivir.',
'Sé tú mismo.',
'No cambies por otros.',
'Sé libre.',
'Cuida tu vida.',
'Sé real.',
'No te engañes.',
'Sé honesto.',
'Cuida tus sueños.',
'Sé ambicioso.',
'No te detengas.',
'Sé constante siempre.',
'Aprende de todo.',
'Sé mejor siempre.',
'Cuida tu futuro.',
'Sé inteligente.',
'No te conformes nunca.',
'Sé decidido.',
'Aprende a luchar.',
'Sé fuerte siempre.',
'Cuida tu presente.',
'Sé feliz siempre.'
];

// 📖 HISTORIAS
const historias = [
'Se conocieron sin buscarse, pero se eligieron para siempre.',
'El destino los unió cuando menos lo esperaban.',
'Dos almas diferentes, un mismo sentimiento.',
'El amor llegó sin avisar y se quedó para siempre.',
'No era perfecto, pero era real.'
];
