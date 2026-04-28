'use strict';

module.exports = {
  commands: ['love', 'amor'],

  async execute(ctx) {
    const { sock, remoteJid, msg, sender, args } = ctx;

    // 🔥 DETECTAR MENCIÓN REAL
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

    let target = mentioned[0];

    // 🔥 SI NO HAY MENCIÓN → INTENTAR CON TEXTO
    if (!target) {
      if (args[0] && args[0].includes('@')) {
        target = args[0].replace('@', '') + '@s.whatsapp.net';
      }
    }

    // 🔥 SI NO HAY NADA → USAR A SÍ MISMO
    if (!target) target = sender;

    const senderTag = '@' + sender.split('@')[0];
    const targetTag = '@' + target.split('@')[0];

    // 🔥 IMPORTANTE PARA QUE MENCIONE
    const mention = [sender, target];

    const lovePercentage = Math.floor(Math.random() * 100);
    const isHighLove = lovePercentage >= 50;

    // 🔥 MENSAJES ALTOS
    const loveMessages = [
      "🔥 Esto ya no es atracción... esto es conexión real.",
      "💘 Aquí hay química fuerte, no la dejes escapar.",
      "✨ Esto tiene potencial de historia seria.",
      "💞 Hay algo especial entre ustedes, no lo ignores.",
      "💓 Esto podría convertirse en algo grande.",
      "🌹 La energía entre ustedes es diferente.",
      "💗 Esto no es casualidad, es conexión.",
      "💖 El destino claramente hizo su trabajo aquí.",
      "💥 Esto puede volverse intenso rápidamente.",
      "💘 Aquí hay sentimientos reales creciendo.",
      "🔥 Esto ya está subiendo de nivel.",
      "💞 No lo arruines, esto vale la pena.",
      "✨ Esto puede ser el inicio de algo bonito.",
      "💓 Aquí hay más que solo interés.",
      "💗 Esto podría marcar un antes y un después.",
      "💖 Esto se siente diferente por una razón.",
      "💘 Aquí hay vibra de relación seria.",
      "🔥 Esto puede volverse algo inolvidable.",
      "💞 No es coincidencia que estén aquí.",
      "💓 Esto tiene futuro si lo cuidan."
    ];

    // 🔥 MENSAJES BAJOS
    const notSoHighLoveMessages = [
      "😅 Hay química... pero más tipo amistad.",
      "🤝 Esto va más por conexión tranquila.",
      "🙂 No todo tiene que ser amor, también vale la amistad.",
      "😌 Puede crecer con el tiempo, no lo fuerces.",
      "🤔 Aún no está claro, dale tiempo.",
      "💭 Tal vez no es amor, pero algo hay.",
      "😶 Hay conexión, pero falta chispa.",
      "😬 Podría mejorar... o quedarse así.",
      "🫤 No todo fluye siempre como uno quiere.",
      "😅 Mejor no ilusionarse demasiado aún.",
      "🤝 Lo importante es que se llevan bien.",
      "🙂 No todo amor empieza fuerte.",
      "😌 Esto puede evolucionar... o no.",
      "🤔 Hay dudas, y eso es normal.",
      "💭 Tal vez es mejor ir lento.",
      "😶 No hay mucha intensidad aún.",
      "😬 Podría quedarse en algo casual.",
      "🫤 No parece algo fuerte por ahora.",
      "😅 Hay conexión, pero leve.",
      "🤝 Esto es más tranquilo que intenso."
    ];

    const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

    const loveMessage = isHighLove
      ? getRandom(loveMessages)
      : getRandom(notSoHighLoveMessages);

    const description = isHighLove
      ? "tienen una conexión fuerte con un nivel de amor"
      : "tienen una conexión ligera, con un nivel de amor";

    const response =
`━━━━━━━⬣ 💖 *LOVE TEST* 💖 ⬣━━━━━━━

👤 ${senderTag}
💘 ${targetTag}

❥ Resultado: ${lovePercentage}% de compatibilidad

❥ ${senderTag} y ${targetTag} ${description} del *${lovePercentage}%*

💬 ${loveMessage}

━━━━━━━⬣ 💖 *LOVE TEST* 💖 ⬣━━━━━━━`;

    // 🔥 BARRA DE CARGA
    const loadingSteps = [
      "《 █▒▒▒▒▒▒▒▒▒▒▒》10%",
      "《 ███▒▒▒▒▒▒▒▒▒》25%",
      "《 █████▒▒▒▒▒▒》50%",
      "《 ████████▒▒▒》75%",
      "《 ███████████》100%"
    ];

    let { key } = await sock.sendMessage(remoteJid, {
      text: "💞 Calculando compatibilidad...",
      mentions: mention
    }, { quoted: msg });

    for (let step of loadingSteps) {
      await new Promise(r => setTimeout(r, 800));
      await sock.sendMessage(remoteJid, {
        text: step,
        edit: key
      }, { quoted: msg });
    }

    // 🔥 RESULTADO FINAL
    await sock.sendMessage(remoteJid, {
      text: response,
      mentions: mention,
      edit: key
    }, { quoted: msg });

  }
};
