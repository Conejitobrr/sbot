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

// 🔥 NUEVAS FRASES

'Si volviera a nacer, te elegiría otra vez.',
'Eres la parte bonita de mis días difíciles.',
'No eres perfecto, pero eres perfecto para mí.',
'Tu forma de existir ya me hace feliz.',
'Eres el motivo por el que sonrío sin razón.',
'Contigo aprendí que el amor sí vale la pena.',
'Eres mi pensamiento favorito antes de dormir.',
'Tu presencia hace todo más ligero.',
'Eres ese "todo" que nunca supe que necesitaba.',
'Contigo quiero intentarlo siempre.',
'Eres mi lugar incluso cuando no estás.',
'Tu amor se siente como hogar.',
'Eres lo mejor que no estaba en mis planes.',
'Tu forma de mirarme lo dice todo.',
'No quiero un final, quiero un contigo siempre.',
'Eres la calma después de todos mis errores.',
'Contigo todo es más sencillo.',
'Eres la razón por la que creo en lo bonito.',
'Tu risa es mi sonido favorito.',
'Eres ese detalle que cambió todo.',
'No te busqué, pero qué bien que te encontré.',
'Eres mi casualidad más necesaria.',
'Contigo todo se siente correcto.',
'Tu amor me encontró cuando más lo necesitaba.',
'Eres lo mejor que llegó sin avisar.',
'Me gustas incluso en tus días difíciles.',
'Eres mi refugio en este mundo caótico.',
'Contigo no necesito nada más.',
'Eres lo que hace especial lo cotidiano.',
'Tu amor es lo que le da sentido a todo.',
'Eres mi paz incluso en la distancia.',
'Contigo el tiempo pasa diferente.',
'Eres lo mejor que me pudo pasar.',
'Tu amor es mi lugar seguro.',
'Eres mi momento favorito del día.',
'Contigo todo se siente más real.',
'Eres la razón por la que intento ser mejor.',
'Tu amor me hace fuerte.',
'Eres la parte bonita de mi historia.',
'Contigo quiero quedarme.',
'Eres mi decisión favorita.',
'Tu amor me hace sentir vivo.',
'Eres todo lo que quiero sin dudar.',
'Contigo todo tiene un porqué.',
'Eres mi mejor "sí".',
'Tu amor es lo único que no cambiaría.',
'Eres mi tranquilidad en medio del ruido.',
'Contigo todo fluye sin esfuerzo.',
'Eres lo que le faltaba a mi vida.',
'Tu amor es mi mejor suerte.',
'Eres lo que siempre quise sin saberlo.',
'Contigo todo vale más.',
'Eres mi forma favorita de felicidad.',
'Tu amor es lo que me mantiene en pie.',
'Eres mi mejor pensamiento.',
'Contigo todo mejora sin explicación.',
'Eres mi coincidencia más bonita.',
'Tu amor es lo mejor que tengo.',
'Eres mi lugar en el mundo.',
'Contigo quiero todo.'
];

// 🌟 100 CONSEJOS REALES
const consejos = [
// 🔥 NUEVOS CONSEJOS

'No tomes decisiones importantes en momentos de enojo.',
'Aprende a estar solo sin sentirte vacío.',
'No todo merece una reacción.',
'Escoge tus batallas con inteligencia.',
'Cuida cómo te hablas a ti mismo.',
'Rodéate de personas que respeten tu paz.',
'No todo el mundo merece acceso a tu vida.',
'El silencio también es una respuesta válida.',
'Aprende a retirarte a tiempo.',
'No te aferres a lo que ya no te hace bien.',
'La constancia siempre supera al talento.',
'Evita compararte con procesos que no conoces.',
'No necesitas la validación de nadie.',
'Escucha tu cuerpo cuando te pide descanso.',
'Aprende a decir "basta" sin sentir culpa.',
'No todos entenderán tu camino, y está bien.',
'Cuida tu energía como cuidas tu dinero.',
'No tomes todo de forma personal.',
'El progreso lento también es progreso.',
'Deja de procrastinar lo que sabes que debes hacer.',
'Aprende a disfrutar sin exceso.',
'No todo lo urgente es importante.',
'Organiza tu tiempo o el tiempo te organizará a ti.',
'Aprende a perder sin perderte.',
'No dejes que el miedo decida por ti.',
'Evita relaciones que te resten más de lo que suman.',
'Escucha consejos, pero decide por ti.',
'Aprende a cerrar ciclos sin explicaciones.',
'No todo necesita una segunda oportunidad.',
'Rodéate de gente que te inspire.',
'No ignores las señales que ya viste antes.',
'Aprende a reconocer cuando estás equivocado.',
'No te castigues por errores pasados.',
'Cuida lo que consumes, también afecta tu mente.',
'No vivas en piloto automático.',
'Aprende a agradecer incluso en días difíciles.',
'No todo el mundo quiere verte bien.',
'Confía en acciones, no en palabras.',
'No te sobre exijas al punto de romperte.',
'Aprende a disfrutar tu propia compañía.',
'No te conformes con menos de lo que mereces.',
'El descanso también es productividad.',
'No descuides tu salud por dinero.',
'Aprende a invertir en ti.',
'No tomes decisiones impulsivas.',
'La disciplina es hacer lo necesario sin ganas.',
'No vivas para impresionar a otros.',
'Aprende a priorizarte.',
'No pierdas tiempo en discusiones inútiles.',
'Elige paz antes que tener la razón.',
'No ignores tus límites.',
'Aprende a reinventarte.',
'No dependas emocionalmente de nadie.',
'Cuida tus pensamientos, crean tu realidad.',
'No todo lo que quieres te conviene.',
'Aprende a disfrutar el proceso, no solo el resultado.',
'No te estanques en lo cómodo.',
'Aprende a tomar riesgos inteligentes.',
'No te subestimes.',
'Haz hoy algo que tu futuro agradecerá.'
];

// 📖 HISTORIAS
const historias = [
'Se conocieron sin buscarse, pero se eligieron para siempre.',
'El destino los unió cuando menos lo esperaban.',
'Dos almas diferentes, un mismo sentimiento.',
'El amor llegó sin avisar y se quedó para siempre.',
'No era perfecto, pero era real.',

// 🔥 NUEVAS HISTORIAS

'Se cruzaron por casualidad, pero se quedaron por decisión.',
'Nunca imaginaron que un simple mensaje cambiaría sus vidas.',
'Empezaron como desconocidos y terminaron siendo todo.',
'El amor los encontró cuando ambos habían dejado de buscar.',
'No fue fácil, pero valió cada intento.',
'Entre risas y errores, aprendieron a amarse.',
'El tiempo los separó, pero el destino los volvió a unir.',
'Se prometieron poco, pero se dieron todo.',
'No era el momento perfecto, pero sí la persona correcta.',
'Se eligieron incluso en sus peores días.',
'El amor creció en silencio hasta hacerse imposible de ignorar.',
'Se convirtieron en hogar el uno del otro.',
'No fue un cuento de hadas, pero fue real.',
'Aprendieron que amar también es quedarse.',
'Se encontraron en el momento más inesperado.',
'No sabían cuánto se necesitaban hasta que se tuvieron.',
'Se volvieron imprescindibles sin darse cuenta.',
'Cada día juntos era una nueva historia.',
'No eran perfectos, pero juntos eran suficientes.',
'El amor llegó lento, pero se quedó fuerte.',
'Se enseñaron a amar sin miedo.',
'Se convirtieron en su lugar seguro.',
'No necesitaban promesas, solo querían quedarse.',
'Se eligieron incluso cuando todo era difícil.',
'El amor los cambió para bien.',
'No buscaban amor, pero se encontraron entre ellos.',
'Se entendían sin necesidad de palabras.',
'El tiempo hizo lo suyo, y el amor también.',
'Se volvieron costumbre, y luego necesidad.',
'Aprendieron a sanar juntos.',
'El amor los encontró rotos y los reconstruyó.',
'Se eligieron cada día, sin obligación.',
'El destino insistió hasta unirlos.',
'Se volvieron inseparables sin planearlo.',
'El amor nació en los detalles pequeños.',
'Se convirtieron en lo que siempre buscaron.',
'No sabían amar, pero aprendieron juntos.',
'Se volvieron hogar en medio del caos.',
'El amor llegó cuando más lo necesitaban.',
'Se encontraron en medio de sus propias tormentas.',
'Se volvieron luz el uno del otro.',
'No era perfecto, pero era sincero.',
'Se eligieron sin garantías.',
'El amor creció en lo simple.',
'Se volvieron todo sin darse cuenta.',
'Se amaron incluso en sus versiones más difíciles.',
'El destino los cruzó más de una vez hasta que se quedaron.',
'Aprendieron que amar también es entender.',
'Se volvieron paz en medio del ruido.',
'El amor no fue fácil, pero fue real.',
'Se eligieron sin condiciones.',
'Se convirtieron en historia sin planearlo.',
'El amor nació en el momento menos esperado.',
'Se quedaron cuando pudieron irse.',
'Se volvieron prioridad sin decirlo.',
'El amor fue su mejor coincidencia.'
];
