'use strict';

module.exports = {
  commands: ['topgays', 'topotakus'],

  async execute(ctx) {
    const { sock, remoteJid, msg, command } = ctx;

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

    if (participants.length < 2) {
      return sock.sendMessage(remoteJid, {
        text: '❌ No hay suficientes usuarios'
      }, { quoted: msg });
    }

    // 🔥 SHUFFLE (SIN REPETIR)
    for (let i = participants.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [participants[i], participants[j]] = [participants[j], participants[i]];
    }

    const top10 = participants.slice(0, 10);

    const tag = (u) => '@' + u.split('@')[0];

    let title = '';
    let audioPath = '';

    // 🔥 COMANDOS
    if (command === 'topgays') {
      title = '🌈 TOP 10 GAYS/LESBIANAS DEL GRUPO 🌈';
      audioPath = './media/gay2.mp3';
    }

    if (command === 'topotakus') {
      title = '🌸 TOP 10 OTAKUS DEL GRUPO 🌸';
      audioPath = './media/otaku.mp3';
    }

    let textTop = `*${title}*\n\n`;

    top10.forEach((user, i) => {
      textTop += `*_ ${i + 1}.- ${tag(user)}_*\n`;
    });

    // 🔥 ENVIAR MENSAJE
    await sock.sendMessage(remoteJid, {
      text: textTop,
      mentions: top10
    }, { quoted: msg });

    // 🔥 ENVIAR AUDIO
    await sock.sendMessage(remoteJid, {
      audio: { url: audioPath },
      mimetype: 'audio/mpeg',
      ptt: true
    }, { quoted: msg });

  }
};
