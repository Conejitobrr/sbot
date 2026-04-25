const fs = require('fs');
const path = require('path');

module.exports = {
  async onMessage(ctx) {
    const { sock, remoteJid, body } = ctx;

    if (!body) return;

    const text = body.toLowerCase().trim();

    const audios = {
      'hola': 'hola.opus',
      'autoestima': 'Autoestima.opus'
    };

    const file = audios[text];
    if (!file) return;

    const filePath = path.join(__dirname, '../media', file);

    if (!fs.existsSync(filePath)) return;

    const audio = fs.readFileSync(filePath);

    await sock.sendMessage(remoteJid, {
      audio,
      mimetype: 'audio/ogg; codecs=opus', // 🔥 clave real de WhatsApp
      ptt: true // 🎤 nota de voz
    });
  }
};
