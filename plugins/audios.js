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
      autoestima: 'Autoestima.mp3',
      hola: 'hola.mp3'
    };

    const match = Object.keys(audios).find(k =>
      text.includes(k)
    );

    if (!match) return;

    const filePath = path.join(__dirname, '../media', audios[match]);

    if (!fs.existsSync(filePath)) return;

    const output = path.join(__dirname, '../media/temp.ogg');

    try {
      // 🔥 convertir a nota de voz real WhatsApp
      execSync(
        `ffmpeg -y -i "${filePath}" -c:a libopus -b:a 64k "${output}"`
      );

      const audio = fs.readFileSync(output);

      await sock.sendMessage(remoteJid, {
        audio,
        mimetype: 'audio/ogg; codecs=opus',
        ptt: true
      }, {
        quoted: msg || null   // 🔥 CLAVE
      });

      fs.unlinkSync(output);

    } catch (e) {
      console.log('❌ error audio:', e);
    }
  }
};
