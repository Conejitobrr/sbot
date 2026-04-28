'use strict';

module.exports = {
  commands: ['formarparejas', 'parejas5', 'topparejas'],

  async execute(ctx) {
    const { sock, msg, remoteJid } = ctx;

    try {
      const metadata = await sock.groupMetadata(remoteJid);
      const participants = metadata.participants.map(p => p.id);

      if (participants.length < 10) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Se necesitan al menos 10 personas en el grupo'
        }, { quoted: msg });
      }

      // 🎲 función random
      const pick = () => participants[Math.floor(Math.random() * participants.length)];

      // 🔥 elegir 10 distintos
      let usados = new Set();
      let seleccion = [];

      while (seleccion.length < 10) {
        let user = pick();
        if (!usados.has(user)) {
          usados.add(user);
          seleccion.push(user);
        }
      }

      const toM = (a) => `@${a.split('@')[0]}`;

      // 💬 frases dinámicas
      const frases = [
        '💙 Esta pareja está destinada a estar junta',
        '✨ Son dos pequeños tortolitos enamorados',
        '🔥 Ya deberían tener familia juntos',
        '💍 Se casaron en secreto',
        '🥵 Andan de luna de miel',
        '😏 Hay mucha tensión entre ellos',
        '💕 Amor confirmado por el grupo',
        '👀 Nadie puede negar esta química',
        '💖 Son el uno para el otro',
        '😳 Esto ya no es coincidencia'
      ];

      function frase() {
        return frases[Math.floor(Math.random() * frases.length)];
      }

      const texto = `*_😍 Las 5 mejores parejas del grupo 😍_*

*_1.- ${toM(seleccion[0])} y ${toM(seleccion[1])}_*
- ${frase()}

*_2.- ${toM(seleccion[2])} y ${toM(seleccion[3])}_*
- ${frase()}

*_3.- ${toM(seleccion[4])} y ${toM(seleccion[5])}_*
- ${frase()}

*_4.- ${toM(seleccion[6])} y ${toM(seleccion[7])}_*
- ${frase()}

*_5.- ${toM(seleccion[8])} y ${toM(seleccion[9])}_*
- ${frase()}`;

      await sock.sendMessage(remoteJid, {
        text: texto,
        mentions: seleccion
      }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error en parejas5:', err);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error al generar parejas'
      }, { quoted: msg });
    }
  }
};
