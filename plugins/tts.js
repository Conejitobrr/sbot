'use strict';

const gTTS = require('gtts');
const fs = require('fs');
const path = require('path');

module.exports = {
  commands: ['tts'],
  description: 'Texto a voz en español',

  async execute(ctx) {
    const { sock, remoteJid, args, msg } = ctx;

    if (!args.length) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Ejemplo:\n.tts Hola mundo'
      }, { quoted: msg });
    }

    const text = args.join(' ');
    const filePath = path.join(__dirname, '../tmp/tts.mp3');

    try {
      const tts = new gTTS(text, 'es');

      // 🔥 Convertimos a PROMESA para evitar archivo corrupto
      await new Promise((resolve, reject) => {
        tts.save(filePath, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // 🔥 Leer archivo ya completo
      const audio = fs.readFileSync(filePath);

      await sock.sendMessage(remoteJid, {
        audio: audio,
        mimetype: 'audio/mpeg',
        ptt: true
      }, { quoted: msg });

      // borrar después
      fs.unlinkSync(filePath);

    } catch (e) {
      console.log(e);
      await sock.sendMessage(remoteJid, {
        text: '❌ Error generando el audio'
      }, { quoted: msg });
    }
  }
};
