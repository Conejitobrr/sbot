'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

module.exports = {
  async onMessage(ctx) {
    const { sock, remoteJid, body } = ctx;

    if (!body) return;

    const text = body.toLowerCase().trim();

    const audios = {
      'hola': 'hola.mp3',
      'autoestima': 'Autoestima.mp3'
    };

    const file = audios[text];
    if (!file) return;

    const inputPath = path.join(__dirname, '../media', file);

    if (!fs.existsSync(inputPath)) return;

    const tempPath = path.join(__dirname, '../media/temp.opus');

    try {
      // 🔥 CONVERTIR MP3 → OPUS (nota de voz real)
      execSync(
        `ffmpeg -y -i "${inputPath}" -c:a libopus -b:a 64k "${tempPath}"`
      );

      const audio = fs.readFileSync(tempPath);

      await sock.sendMessage(remoteJid, {
        audio,
        mimetype: 'audio/ogg; codecs=opus',
        ptt: true
      });

      // 🧹 borrar temporal
      fs.unlinkSync(tempPath);

    } catch (err) {
      console.log('❌ Error convirtiendo audio:', err);
    }
  }
};
