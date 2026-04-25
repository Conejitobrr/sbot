'use strict';

module.exports = {
  commands: ['pregunta', 'preguntas', 'apakah'],

  async execute(ctx) {
    const { sock, msg, remoteJid } = ctx;

    try {
      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        '';

      if (!text || text.trim() === '') {
        return sock.sendMessage(remoteJid, {
          text: '❌ Escribe una pregunta.\nEjemplo: .pregunta voy a tener suerte?'
        }, { quoted: msg });
      }

      const mentioned =
        msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

      const respuestas = [
        'Sí',
        'Tal vez sí',
        'Posiblemente',
        'Probablemente no',
        'No',
        'Imposible'
      ];

      const random =
        respuestas[Math.floor(Math.random() * respuestas.length)];

      const respuesta =
`⁉️ *PREGUNTA* ⁉️

🧠 *Pregunta:* ${text}
🤖 *Respuesta:* ${random}`;

      await sock.sendMessage(
        remoteJid,
        {
          text: respuesta,
          mentions: mentioned
        },
        { quoted: msg }
      );

    } catch (err) {
      console.log('PREGUNTA ERROR:', err.message);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error al procesar la pregunta'
      }, { quoted: msg });
    }
  }
};
