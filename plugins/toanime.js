'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
  commands: ['toanime'],

  async execute(ctx) {
    const { sock, msg, remoteJid } = ctx;

    try {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const message = quoted || msg.message;

      const type = Object.keys(message || {})[0];

      if (!type || type !== 'imageMessage') {
        return sock.sendMessage(remoteJid, {
          text: '❌ Responde a una imagen con .toanime'
        }, { quoted: msg });
      }

      const media = message[type];

      const stream = await downloadContentFromMessage(media, 'image');

      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      const input = path.join(tempDir, 'input.jpg');
      const output = path.join(tempDir, 'anime.png');

      fs.writeFileSync(input, buffer);

      // 🔥 MODELO STABLE ANIME (FUNCIONAL)
      const HF_API_KEY = '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';

      const imageBuffer = fs.readFileSync(input);

      const response = await axios.post(
        'https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5',
        imageBuffer,
        {
          headers: {
            Authorization: `Bearer ${HF_API_KEY}`,
            'Content-Type': 'application/octet-stream'
          },
          params: {
            // prompt anime estilo
            prompt: "anime style, high quality, detailed face, cinematic lighting, ultra clean illustration"
          },
          responseType: 'arraybuffer',
          timeout: 120000
        }
      );

      fs.writeFileSync(output, response.data);

      await sock.sendMessage(remoteJid, {
        image: fs.readFileSync(output),
        caption: '✨ Anime IA PRO aplicado'
      }, { quoted: msg });

      fs.unlinkSync(input);
      fs.unlinkSync(output);

    } catch (err) {
      console.log('ANIME API ERROR:', err.response?.data || err.message);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error con IA anime. Intenta nuevamente o revisa tu token.'
      }, { quoted: msg });
    }
  }
};
