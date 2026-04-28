'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

    // 🔥 SHUFFLE SIN REPETIR
    for (let i = participants.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [participants[i], participants[j]] = [participants[j], participants[i]];
    }

    const top10 = participants.slice(0, 10);

    const tag = (u) => '@' + u.split('@')[0];

    let title = '';
    let inputFile = '';

    if (command === 'topgays') {
      title = '🌈 TOP 10 GAYS/LESBIANAS DEL GRUPO 🌈';
      inputFile = 'gay2.mp3';
    }

    if (command === 'topotakus') {
      title = '🌸 TOP 10 OTAKUS DEL GRUPO 🌸';
      inputFile = 'otaku.mp3';
    }

    let textTop = `*${title}*\n\n`;

    top10.forEach((user, i) => {
      textTop += `*_ ${i + 1}.- ${tag(user)}_*\n`;
    });

    // 🔥 MENSAJE
    await sock.sendMessage(remoteJid, {
      text: textTop,
      mentions: top10
    }, { quoted: msg });

    // 🔥 CONVERTIR MP3 → OPUS (NOTA DE VOZ REAL)
    try {
      const inputPath = path.join(process.cwd(), 'media', inputFile);
      const outputPath = inputPath.replace('.mp3', '.opus');

      // convertir con ffmpeg
      execSync(`ffmpeg -y -i "${inputPath}" -vn -c:a libopus "${outputPath}"`);

      const buffer = fs.readFileSync(outputPath);

      await sock.sendMessage(remoteJid, {
        audio: buffer,
        mimetype: 'audio/ogg; codecs=opus',
        ptt: true // 🔥 nota de voz real
      }, { quoted: msg });

    } catch (e) {
      console.log('❌ Error convirtiendo/enviando audio:', e.message);
    }
  }
};
