'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

module.exports = {
  commands: ['gay'],

  async execute(ctx) {
    const { sock, remoteJid, msg } = ctx;

    // 🔥 DETECTAR USUARIO
    const quoted = msg.message?.extendedTextMessage?.contextInfo;
    const mentioned = quoted?.mentionedJid || [];

    let who =
      mentioned[0] ||
      quoted?.participant ||
      (msg.key.fromMe ? sock.user.id : msg.key.participant || msg.key.remoteJid);

    // 🔥 FOTO DE PERFIL
    let avatar;
    try {
      avatar = await sock.profilePictureUrl(who, 'image');
    } catch {
      avatar = 'https://telegra.ph/file/24fa902ead26340f3df2c.png';
    }

    // 🔥 URL API (imagen)
    const url = `https://some-random-api.com/canvas/gay?avatar=${encodeURIComponent(avatar)}`;

    // 🔥 ENVIAR IMAGEN
    await sock.sendMessage(remoteJid, {
      image: { url },
      caption: '🏳️‍🌈 *MIREN A ESTE GAY* 🏳️‍🌈'
    }, { quoted: msg });

    // 🔥 ENVIAR AUDIO COMO NOTA DE VOZ REAL
    try {
      const input = path.join(process.cwd(), 'media', 'gay2.mp3');
      const output = path.join(process.cwd(), 'media', 'gay2.ogg');

      // 🔥 CONVERTIR MP3 → OGG OPUS
      execSync(`ffmpeg -i "${input}" -vn -c:a libopus -b:a 128k "${output}" -y`);

      const buffer = fs.readFileSync(output);

      await sock.sendMessage(remoteJid, {
        audio: buffer,
        mimetype: 'audio/ogg; codecs=opus',
        ptt: true
      }, { quoted: msg });

    } catch (e) {
      console.log('❌ Error audio:', e.message);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error al convertir el audio'
      }, { quoted: msg });
    }

  }
};
