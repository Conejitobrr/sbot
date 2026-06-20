'use strict';

const gTTS = require('gtts');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

module.exports = {
  commands: ['tts'],
  description: 'Texto a voz (nota de voz real)',

  async execute(ctx) {
    const { sock, remoteJid, args, msg } = ctx;

    if (!args.length) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Ejemplo:\n.tts Hola mundo'
      }, { quoted: msg });
    }

    const text = args.join(' ');

    const mp3 = path.join(__dirname, '../tmp/tts.mp3');
    const ogg = path.join(__dirname, '../tmp/tts.ogg');

    try {
      // 1. Crear mp3
      const tts = new gTTS(text, 'es');

      await new Promise((resolve, reject) => {
        tts.save(mp3, (err) => err ? reject(err) : resolve());
      });

      // 2. Convertir a OPUS (clave 🔥)
      await new Promise((resolve, reject) => {
        exec(`ffmpeg -i ${mp3} -c:a libopus -b:a 128k ${ogg} -y`, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const audio = fs.readFileSync(ogg);

      // 3. Enviar como nota de voz REAL
      await sock.sendMessage(remoteJid, {
        audio: audio,
        mimetype: 'audio/ogg; codecs=opus',
        ptt: true
      }, { quoted: msg });

      // 4. limpiar
      fs.unlinkSync(mp3);
      fs.unlinkSync(ogg);

    } catch (e) {
      console.log(e);
      await sock.sendMessage(remoteJid, {
        text: '❌ Error en TTS (revisa ffmpeg)'
      }, { quoted: msg });
    }
  }
};
