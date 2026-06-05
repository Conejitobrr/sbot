'use strict';

function cleanJid(jid = '') {
  return String(jid).split(':')[0];
}

function number(jid = '') {
  return cleanJid(jid)
    .split('@')[0]
    .replace(/\D/g, '');
}

function getMentioned(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
}

function pickRandom(list = []) {
  return list[Math.floor(Math.random() * list.length)];
}

const VERDADES = [
  '¿Cuál fue la última mentira que dijiste?',
  '¿Alguna vez hablaste mal de alguien de este grupo?',
  '¿Quién de este grupo te cae mejor?',
  '¿Quién de este grupo te parece más misterioso/a?',
  '¿Alguna vez te gustó alguien de este grupo?',
  '¿Qué es lo más vergonzoso que te ha pasado?',
  '¿Cuál fue tu peor cita?',
  '¿Has stalkeado a alguien recientemente?',
  '¿A quién le responderías más rápido un mensaje?',
  '¿Qué persona te pone nervioso/a?',
  '¿Qué secreto pequeño nunca has contado?',
  '¿Cuál fue tu peor excusa para no salir?',
  '¿Alguna vez fingiste estar ocupado/a para no responder?',
  '¿Quién crees que es más chismoso/a del grupo?',
  '¿Quién crees que es más dramático/a del grupo?',
  '¿A quién elegirías para contarle un secreto?',
  '¿Qué fue lo más raro que buscaste en internet?',
  '¿Has eliminado un mensaje por vergüenza?',
  '¿Qué cosa te da pena admitir?',
  '¿Cuál fue tu crush más raro?',
  '¿Alguna vez te gustó alguien que no debías?',
  '¿Quién de este grupo tiene mejor vibra?',
  '¿Quién de este grupo parece más coqueto/a?',
  '¿Quién de este grupo parece más tóxico/a?',
  '¿Cuál es tu mayor red flag?',
  '¿Cuál es tu green flag?',
  '¿Qué te da más celos?',
  '¿Perdonarías una mentira?',
  '¿Has revisado el perfil de alguien muchas veces?',
  '¿A quién extrañas pero no se lo dices?',
  '¿Cuál fue el último chat que borraste?',
  '¿Qué canción te da vergüenza que te guste?',
  '¿Qué es algo que haces cuando nadie te ve?',
  '¿Cuál fue tu peor oso en público?',
  '¿Alguna vez te arrepentiste de enviar un mensaje?',
  '¿A quién le mandarías un “te extraño”?',
  '¿Qué persona te parece difícil de olvidar?',
  '¿Qué es lo más impulsivo que hiciste?',
  '¿Qué es algo que nunca perdonarías?',
  '¿Te han gustado dos personas al mismo tiempo?',
  '¿Alguna vez fingiste que no te importaba alguien?',
  '¿Cuál fue tu mayor ridículo por amor?',
  '¿Qué es lo más raro que te han dicho por chat?',
  '¿Cuál es tu peor hábito?',
  '¿Qué es lo que más te molesta de la gente?',
  '¿Quién de este grupo parece más sincero/a?',
  '¿Quién de este grupo parece más mentiroso/a?',
  '¿Quién de este grupo sería buen/a novio/a?',
  '¿Quién de este grupo sería mala idea como pareja?',
  '¿Qué harías si tu crush te escribe ahora mismo?',
  '¿Alguna vez respondiste seco/a a propósito?',
  '¿Has dejado en visto a alguien que sí te importaba?',
  '¿Qué fue lo último que te dio vergüenza?',
  '¿Cuál es tu mayor miedo en una relación?',
  '¿Te consideras celoso/a?',
  '¿Te consideras orgulloso/a?',
  '¿Pedirías perdón aunque no tengas la culpa?',
  '¿Qué persona te hizo cambiar mucho?',
  '¿Qué es lo más bonito que te han dicho?',
  '¿Qué es lo más feo que te han dicho?',
  '¿Cuál fue tu peor etapa?',
  '¿Qué secreto te gustaría saber de alguien?',
  '¿Alguna vez ocultaste una conversación?',
  '¿A quién le tienes más confianza?',
  '¿Quién te parece más divertido/a del grupo?',
  '¿Quién te parece más serio/a del grupo?',
  '¿Quién te parece más intenso/a del grupo?',
  '¿Qué harías si te declaran su amor hoy?',
  '¿Qué cosa te ilusiona rápido?',
  '¿Cuál fue tu última decepción?',
  '¿Te gusta alguien actualmente?',
  '¿Has fingido que ya superaste a alguien?',
  '¿Qué persona no esperabas extrañar?',
  '¿Alguna vez hablaste con alguien solo por aburrimiento?',
  '¿Qué es algo que no soportas en WhatsApp?',
  '¿Cuál fue tu peor audio enviado?',
  '¿Alguna vez mandaste un mensaje al chat equivocado?',
  '¿Qué cosa te hace perder el interés rápido?',
  '¿Qué te enamora más rápido?',
  '¿Prefieres que te busquen o buscar tú?',
  '¿Has sentido celos sin ser nada?',
  '¿Cuál fue tu peor bloqueo emocional?',
  '¿Quién de este grupo parece más orgulloso/a?',
  '¿Quién de este grupo parece más sensible?',
  '¿Quién de este grupo parece más fiel?',
  '¿Quién de este grupo parece más infiel?',
  '¿Cuál fue tu última indirecta?',
  '¿Alguna vez subiste un estado para que alguien lo vea?',
  '¿A quién va dirigida tu última indirecta?',
  '¿Qué cosa nunca dirías en voz alta?',
  '¿Cuál es tu mayor inseguridad?',
  '¿Qué te cuesta admitir?',
  '¿Has llorado por alguien que no lo merecía?',
  '¿Cuál fue el mensaje que más esperaste?',
  '¿Qué persona te dejó pensando mucho?',
  '¿Alguna vez te arrepentiste de conocer a alguien?',
  '¿Qué es lo más inmaduro que has hecho?',
  '¿Qué es lo más maduro que has hecho?',
  '¿Qué harías si tu ex te escribe?',
  '¿Qué harías si tu crush te manda “hola”?',
  '¿Cuál fue la peor excusa que te dieron?',
  '¿Cuál fue la peor excusa que tú diste?',
  '¿A quién invitarías a salir de este grupo?',
  '¿Con quién tendrías una conversación seria?',
  '¿Quién crees que guarda más secretos?',
  '¿Cuál es una verdad que nadie sabe de ti?'
];

module.exports = {
  commands: ['verdad', 'velda'],

  async execute(ctx) {
    const { sock, msg, remoteJid, sender, args, db } = ctx;

    try {
      const mentioned = getMentioned(msg).map(cleanJid);

      let targetText = '';
      let mentions = [];

      if (mentioned.length) {
        const target = mentioned[0];
        targetText = `@${number(target)}`;
        mentions = [target];
      } else if (args.length) {
        targetText = args.join(' ').trim();
      } else {
        targetText = `@${number(sender)}`;
        mentions = [cleanJid(sender)];
      }

      const pregunta = pickRandom(VERDADES);

      await sock.sendMessage(remoteJid, {
        text:
`🎭 *VERDAD*

👤 Para: *${targetText}*

❓ ${pregunta}`,
        mentions
      }, { quoted: msg });

      try {
        if (db?.addXP) {
          await db.addXP(sender, Math.floor(Math.random() * 16) + 10);
        }
      } catch {}

    } catch (err) {
      console.log('❌ Error en verdad:', err?.message || err);

      return sock.sendMessage(remoteJid, {
        text: '❌ Error usando el comando verdad.'
      }, { quoted: msg });
    }
  }
};
