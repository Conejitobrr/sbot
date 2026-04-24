'use strict';

const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const Replicate = require('replicate');

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
      const output = path.join(tempDir, 'anime.jpg');

      fs.writeFileSync(input, buffer);

      // 🔑 REPLICATE TOKEN
      const replicate = new Replicate({
        auth: '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'
      });

      const imageBase64 = fs.readFileSync(input, { encoding: 'base64' });

      const result = await replicate.run(
        "cjwbw/anything-v4.0-img2img",
        {
          input: {
            image: `data:image/jpeg;base64,${imageBase64}`,
            prompt: "anime style, high quality, detailed face, cinematic lighting, ultra detailed illustration",
            strength: 0.75
          }
        }
      );

      const imageUrl = result[0];

      const img = await fetch(imageUrl);
      const arrayBuffer = await img.arrayBuffer();

      fs.writeFileSync(output, Buffer.from(arrayBuffer));

      await sock.sendMessage(remoteJid, {
        image: fs.readFileSync(output),
        caption: '✨ Anime IA PRO aplicado'
      }, { quoted: msg });

      fs.unlinkSync(input);
      fs.unlinkSync(output);

    } catch (err) {
      console.log('ANIME API ERROR:', err.message || err);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error con IA anime (Replicate)'
      }, { quoted: msg });
    }
  }
};
