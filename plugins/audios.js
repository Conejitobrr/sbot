'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

module.exports = {
  async onMessage(ctx) {
    const { sock, remoteJid, body, msg } = ctx;

    if (!body) return;

    const text = body.toLowerCase();

    const audios = {
      'autoestima': 'Autoestima.mp3',
      'hola': 'hola.mp3'
    };

    const match = Object.keys(audios).find(key =>
      text.includes(key)
    );

    if (!match) return;

    const inputPath = path.join(__dirname, '../media', audios[match]);

    if (!fs.existsSync(inputPath)) return;

    const tempPath = path.join(__dirname, '../media/temp.opus');

    try {
      // 🔥 convertir mp3 → opus
      execSync(
        `ffmpeg -y -i "${inputPath}" -c:a libopus -b:a 64k "${tempPath}"`
      );

      const audio = fs.readFileSync(tempPath);

      // 🎤 ENVIAR COMO NOTA DE VOZ RESPONDIENDO AL MENSAJE
      await sock.sendMessage(remoteJid, {
        audio,
        mimetype: 'audio/ogg; codecs=opus',
        ptt: true
      }, {
        quoted: msg   // 👈 ESTO ES LO IMPORTANTE
      });

      fs.unlinkSync(tempPath);

    } catch (err) {
      console.log('❌ error audio:', err);
    }
  }
};
