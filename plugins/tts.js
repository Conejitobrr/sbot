'use strict';

const gTTS = require('gtts');
const fs = require('fs');
const path = require('path');

module.exports = {
  commands: ['tts'],
  description: 'Convierte texto a voz',

  async execute(ctx) {
    const { sock, remoteJid, args, msg } = ctx;

    if (!args.length) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Escribe un texto\nEjemplo:\n.tts Hola mundo'
      }, { quoted: msg });
    }

    const text = args.join(' ');
    const filePath = path.join(__dirname, '../tmp/tts.mp3');

    try {
      const tts = new gTTS(text, 'es');

      // Guardar audio temporal
      tts.save(filePath, async (err) => {
        if (err) {
          return sock.sendMessage(remoteJid, {
            text: '❌ Error generando audio'
          }, { quoted: msg });
        }

        // Enviar audio
        await sock.sendMessage(remoteJid, {
          audio: fs.readFileSync(filePath),
          mimetype: 'audio/mpeg',
          ptt: true
        }, { quoted: msg });

        // Borrar archivo
        fs.unlinkSync(filePath);
      });

    } catch (e) {
      await sock.sendMessage(remoteJid, {
        text: '❌ Error en TTS'
      }, { quoted: msg });
    }
  }
};
