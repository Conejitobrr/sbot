
'use strict';

module.exports = {
  commands: ['formarpareja', 'pareja', 'ship'],

  async execute(ctx) {
    const { sock, msg, remoteJid } = ctx;

    try {
      const metadata = await sock.groupMetadata(remoteJid);
      const participants = metadata.participants.map(p => p.id);

      if (participants.length < 2) {
        return sock.sendMessage(remoteJid, {
          text: '❌ No hay suficientes personas'
        }, { quoted: msg });
      }

      // 🎲 elegir 2 distintos
      const a = participants[Math.floor(Math.random() * participants.length)];
      let b;

      do {
        b = participants[Math.floor(Math.random() * participants.length)];
      } while (b === a);

      const userA = `@${a.split('@')[0]}`;
      const userB = `@${b.split('@')[0]}`;

      // 💬 FRASES (incluye la original como principal)
      const frases = [
        `💍 ${userA}, deberías casarte con ${userB}, hacen una buena pareja 💓`, // ⭐ PRINCIPAL
        `💘 ${userA} y ${userB} hacen una pareja perfecta 😍`,
        `🔥 Entre ${userA} y ${userB} hay química 👀`,
        `😏 ${userA} no lo niegues… ${userB} te gusta`,
        `💕 ${userA} + ${userB} = amor confirmado`,
        `🥰 ${userA} y ${userB} ya deberían estar juntos`,
        `💓 Se siente la tensión entre ${userA} y ${userB}`,
        `👀 Todos sabemos que ${userA} y ${userB} hacen match`,
        `💖 ${userA} encontró a su media naranja: ${userB}`,
        `😳 ${userA} y ${userB}... esto ya es sospechoso`
      ];

      const mensaje = frases[Math.floor(Math.random() * frases.length)];

      await sock.sendMessage(remoteJid, {
        text: mensaje,
        mentions: [a, b]
      }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error en pareja:', err);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error al formar pareja'
      }, { quoted: msg });
    }
  }
};
