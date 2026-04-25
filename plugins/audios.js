'use strict';

const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'audios',

  async onMessage(ctx) {
    const { sock, remoteJid, body } = ctx;

    if (!body) return;

    const text = body.toLowerCase().trim();

    // 🎧 palabras clave → archivos de audio
    const audios = {
      'hola': 'hola.mp3',
      'adios': 'adios.mp3',
      'buenos dias': 'buenosdias.mp3'
    };

    const file = audios[text];
    if (!file) return;

    const filePath = path.join(__dirname, '../media', file);

    if (!fs.existsSync(filePath)) return;

    const audio = fs.readFileSync(filePath);

    await sock.sendMessage(remoteJid, {
      audio,
      mimetype: 'audio/mpeg',
      ptt: true // 🎤 como nota de voz
    });
  }
};
