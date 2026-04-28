'use strict';

module.exports = {
  commands: ['love', 'amor'],

  async execute(ctx) {
    const { sock, remoteJid, msg, sender, args } = ctx;

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

    // 🔥 SI MENCIONA A ALGUIEN
    let target = mentioned[0];

    // 🔥 SI NO MENCIONA, USA TEXTO
    if (!target) {
      if (args[0] && args[0].includes('@')) {
        target = args[0].replace('@', '') + '@s.whatsapp.net';
      }
    }

    // 🔥 FALLBACK
    if (!target) target = sender;

    const senderTag = '@' + sender.split('@')[0];
    const targetTag = '@' + target.split('@')[0];

    const lovePercentage = Math.floor(Math.random() * 100);
    const isHighLove = lovePercentage >= 50;

    const messagesHigh = [
      "🔥 Esto ya es conexión real.",
      "💘 Hay química fuerte aquí.",
      "💞 Esto puede crecer mucho.",
      "✨ Esto tiene futuro.",
      "💓 Algo especial está pasando."
    ];

    const messagesLow = [
      "😅 Más amistad que otra cosa.",
      "🤝 Conexión tranquila.",
      "🙂 Puede mejorar con el tiempo.",
      "😌 No todo es amor.",
      "🤔 Aún no está claro."
    ];

    const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

    const msgFinal = isHighLove ? getRandom(messagesHigh) : getRandom(messagesLow);

    const response =
`━━━━━━━⬣ 💖 LOVE TEST 💖 ⬣━━━━━━━

👤 ${senderTag}
💘 ${targetTag}

❥ Resultado: ${lovePercentage}%

❥ ${senderTag} y ${targetTag} tienen ${
      isHighLove ? 'una conexión fuerte' : 'una conexión ligera'
    } del *${lovePercentage}%*

💬 ${msgFinal}

━━━━━━━⬣ 💖 LOVE TEST 💖 ⬣━━━━━━━`;

    await sock.sendMessage(remoteJid, {
      text: response,
      mentions: [sender, target] // 🔥 AQUÍ ESTÁ LA CLAVE
    }, { quoted: msg });

  }
};
