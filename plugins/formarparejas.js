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

      const pick = () => participants[Math.floor(Math.random() * participants.length)];

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

      // 🔥 FRASES CON EMOJIS AL INICIO Y FINAL
      const frases = [
        '💙✨ Están destinados a estar juntos 🔥💙',
        '😍💕 Parecen sacados de una película 🎬😍',
        '🔥😏 Aquí hay química peligrosa 👀🔥',
        '💍👀 Se casaron en secreto 💍👀',
        '🥵❤️‍🔥 Andan en luna de miel 🥵❤️‍🔥',
        '😳💞 Esto ya no es coincidencia 😳💞',
        '💖🌹 Amor puro, conexión real 💖🌹',
        '👀💘 Todo el grupo lo ve venir 👀💘',
        '😏🔥 Se traen ganas pero lo disimulan 😏🔥',
        '💑✨ Pareja estable nivel matrimonio 💑✨',
        '🤭💕 Se escriben en secreto 🤭💕',
        '💓👀 Miradas sospechosas detectadas 💓👀',
        '🔥🥀 Amor intenso pero peligroso 🔥🥀',
        '💘😌 Encajan perfectamente 💘😌',
        '🥰🌟 Son el uno para el otro 🥰🌟',
        '😈❤️ Relación prohibida pero interesante 😈❤️',
        '💋🔥 Mucha tensión… esto va a explotar 💋🔥',
        '💖👫 Relación seria en proceso 💖👫',
        '🥵💞 Aquí hay más que amistad 🥵💞',
        '🌹💍 Futuro juntos confirmado 🌹💍'
      ];

      function frase() {
        return frases[Math.floor(Math.random() * frases.length)];
      }

      const texto = `*_😍🔥 TOP 5 PAREJAS DEL GRUPO 🔥😍_*

💘 *_1.- ${toM(seleccion[0])} y ${toM(seleccion[1])}_*
➤ ${frase()}

💞 *_2.- ${toM(seleccion[2])} y ${toM(seleccion[3])}_*
➤ ${frase()}

🔥 *_3.- ${toM(seleccion[4])} y ${toM(seleccion[5])}_*
➤ ${frase()}

💍 *_4.- ${toM(seleccion[6])} y ${toM(seleccion[7])}_*
➤ ${frase()}

🥵 *_5.- ${toM(seleccion[8])} y ${toM(seleccion[9])}_*
➤ ${frase()}

━━━━━━━━━━━━━━━
💬 *El destino habló...* 😏✨`;

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
