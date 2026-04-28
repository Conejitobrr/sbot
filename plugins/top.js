'use strict';

module.exports = {
  commands: ['top'],

  async execute(ctx) {
    const { sock, remoteJid, msg, args } = ctx;

    const text = args.join(' ');
    if (!text) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Ejemplo:\n.top guapos'
      }, { quoted: msg });
    }

    // 🔥 OBTENER PARTICIPANTES
    let metadata;
    try {
      metadata = await sock.groupMetadata(remoteJid);
    } catch {
      return sock.sendMessage(remoteJid, {
        text: '❌ Este comando solo funciona en grupos'
      }, { quoted: msg });
    }

    let participants = metadata.participants.map(v => v.id);

    // 🔥 EVITAR ERRORES SI HAY MENOS DE 10
    if (participants.length < 2) {
      return sock.sendMessage(remoteJid, {
        text: '❌ No hay suficientes usuarios en el grupo'
      }, { quoted: msg });
    }

    // 🔥 SHUFFLE (MEZCLAR ARRAY)
    for (let i = participants.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [participants[i], participants[j]] = [participants[j], participants[i]];
    }

    // 🔥 TOMAR SOLO 10 SIN REPETIR
    const top10 = participants.slice(0, 10);

    const emojiList = ['🤓','😅','😂','😳','😎','🥵','😱','🤑','🙄','💩','🍑','🤨','🥴','🔥','👇🏻','😔','👀','🌚'];
    const emoji = emojiList[Math.floor(Math.random() * emojiList.length)];

    const tag = (u) => '@' + u.split('@')[0];

    let textTop = `*${emoji} TOP 10 ${text.toUpperCase()} ${emoji}*\n\n`;

    top10.forEach((user, i) => {
      const pos = ['🥇','🥈','🥉'][i] || `${i + 1}.`;
      textTop += `${pos} ${tag(user)}\n`;
    });

    // 🔥 ENVIAR
    await sock.sendMessage(remoteJid, {
      text: textTop,
      mentions: top10
    }, { quoted: msg });

    // 🔥 AUDIO OPCIONAL
    const k = Math.floor(Math.random() * 70);
    const vn = `https://hansxd.nasihosting.com/sound/sound${k}.mp3`;

    await sock.sendMessage(remoteJid, {
      audio: { url: vn },
      mimetype: 'audio/mpeg',
      ptt: true
    }, { quoted: msg });

  }
};
