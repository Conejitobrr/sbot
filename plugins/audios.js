'use strict';

const fs = require('fs');
const path = require('path');

module.exports = {
  async onMessage(ctx) {
    const { sock, remoteJid, body } = ctx;

    if (!body) return;

    const text = body.toLowerCase().trim();

    const audios = {
      'hola': 'hola.mp3'
      'autoestima': 'autoestima.mp3'
    };

    const file = audios[text];
    if (!file) return;

    const filePath = path.join(__dirname, '../media', file);

    console.log('📁 buscando audio en:', filePath);

    if (!fs.existsSync(filePath)) {
      console.log('❌ audio no existe');
      return;
    }

    const audio = fs.readFileSync(filePath);

    await sock.sendMessage(remoteJid, {
      audio,
      mimetype: 'audio/mpeg',
      ptt: true
    });
  }
};
