const fs = require('fs');
const path = require('path');

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

    const filePath = path.join(__dirname, '../media', file);

    if (!fs.existsSync(filePath)) return;

    const audioBuffer = fs.readFileSync(filePath);

    await sock.sendMessage(remoteJid, {
      audio: audioBuffer,
      mimetype: 'audio/mp4', // 🔥 clave para WhatsApp
      ptt: true // 🎤 lo convierte en nota de voz
    });
  }
};
