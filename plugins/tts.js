'use strict';

const axios = require('axios');

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

    try {
      // API gratuita de TTS
      const url = `https://api.streamelements.com/kappa/v2/speech?voice=es-ES-Standard-A&text=${encodeURIComponent(text)}`;

      const response = await axios.get(url, {
        responseType: 'arraybuffer'
      });

      const audioBuffer = Buffer.from(response.data);

      await sock.sendMessage(remoteJid, {
        audio: audioBuffer,
        mimetype: 'audio/mpeg',
        ptt: true // ← lo envía como nota de voz
      }, { quoted: msg });

    } catch (e) {
      await sock.sendMessage(remoteJid, {
        text: '❌ Error generando el audio'
      }, { quoted: msg });
    }
  }
};
