'use strict';

const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'autoaudio',

  async onMessage(ctx) {
    const { sock, remoteJid, body } = ctx;

    if (!body) return;

    const text = body.toLowerCase().trim();

    // 🎧 mapa de palabras → audios
    const audios = {
      'hola': 'hola.mp3',
      'buenos dias': 'buenosdias.mp3',
      'adios': 'adios.mp3'
    };

    const file = audios[text];

    if (!file) return;

    const filePath = path.join(__dirname, '../media', file);

    if (!fs.existsSync(filePath)) {
      console.log('❌ Audio no existe:', filePath);
      return;
    }

    const audio = fs.readFileSync(filePath);

    await sock.sendMessage(remoteJid, {
      audio,
      mimetype: 'audio/mpeg',
      ptt: true // 🎤 como nota de voz
    });
  }
};
