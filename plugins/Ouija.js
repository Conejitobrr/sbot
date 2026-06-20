'use strict';

module.exports = {
  commands: ['ouija', 'espiritu'],
  description: 'Hazle una pregunta a la Ouija',

  async execute(ctx) {
    const { sock, remoteJid, msg, args, isGroup } = ctx;

    // Si solo ponen ".ouija" sin preguntar nada
    if (!args.length) {
      return sock.sendMessage(remoteJid, {
        text: '🕯️ *TABLERO OUIJA* 🕯️\n\nDebes hacerle una pregunta a los espíritus.\n*Ejemplo:* `.ouija ¿Quién se va a casar primero?`'
      }, { quoted: msg });
    }

    // 1. Mensaje de suspenso (se envía al instante)
    await sock.sendMessage(remoteJid, { 
      text: '🕯️ *Invocando... la pieza comienza a moverse lentamente sobre el tablero...*' 
    }, { quoted: msg });

    // 2. Esperamos 3 segundos usando setTimeout para darle misterio
    setTimeout(async () => {
      let respuestaFinal = '';
      let menciones = [];

      // Probabilidad: 40% de mencionar a alguien del grupo, 60% de dar una respuesta normal
      const usarMencion = isGroup && Math.random() < 0.4;

      if (usarMencion) {
        try {
          // Extraemos a todos los participantes del grupo
          const groupMetadata = await sock.groupMetadata(remoteJid);
          const participants = groupMetadata.participants.map(p => p.id);
          
          // Elegimos a una víctima al azar
          const randomUser = participants[Math.floor(Math.random() * participants.length)];
          const userNumber = randomUser.split('@')[0];
          
          // Frases espeluznantes separadas por espacios para simular que deletrea
          const frasesMencion = [
            `E S  @${userNumber}`,
            `E L  E S P I R I T U  S E Ñ A L A  A  @${userNumber}`,
            `@${userNumber}  L O  S A B E`,
            `L A  C U L P A  E S  D E  @${userNumber}`,
            `T E N  C U I D A D O  C O N  @${userNumber}`
          ];

          respuestaFinal = frasesMencion[Math.floor(Math.random() * frasesMencion.length)];
          menciones.push(randomUser);
        } catch (error) {
          respuestaFinal = 'H A Y  I N T E R F E R E N C I A . . .';
        }
      } else {
        // Respuestas clásicas de Ouija separadas por espacios
        const respuestasNormales = [
          'S Í', 
          'N O', 
          'T A L  V E Z', 
          'N U N C A', 
          'M U Y  P R O N T O',
          'A D I Ó S', 
          'H U Y E', 
          'E S T Á  D E T R Á S  D E  T I',
          'J A J A J A', 
          'N O  P U E D O  D E C I R T E L O',
          'E L  F U T U R O  E S  O S C U R O', 
          'P R E G U N T A  O T R A  V E Z'
        ];
        respuestaFinal = respuestasNormales[Math.floor(Math.random() * respuestasNormales.length)];
      }

      // 3. Enviamos la respuesta final
      const textoOuija = `👻 *LA OUIJA HA HABLADO* 👻\n\n${respuestaFinal}\n\n*La pieza se mueve a:* ⏣ A d i ó s .`;

      await sock.sendMessage(remoteJid, { 
        text: textoOuija, 
        mentions: menciones 
      }, { quoted: msg });

    }, 3000); // 3000 milisegundos = 3 segundos de suspenso
  }
};
