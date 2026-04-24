'use strict';

require('dotenv').config();

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
      const output = path.join(tempDir, 'anime.jpg');

      fs.writeFileSync(input, buffer);

      const HF_API_KEY = process.env.HF_API_KEY;

      if (!HF_API_KEY) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Falta HF_API_KEY en .env'
        }, { quoted: msg });
      }

      // 🔥 SPACE API (NO 413, NO BASE64)
      const imageBase64 = fs.readFileSync(input, { encoding: 'base64' });

      const response = await axios.post(
        'https://hf.space/embed/akhaliq/AnimeGANv2/api/predict/',
        {
          data: [`data:image/jpeg;base64,${imageBase64}`]
        },
        {
          headers: {
            Authorization: `Bearer ${HF_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const imageUrl = response.data.data[0];

      const img = await axios.get(imageUrl, {
        responseType: 'arraybuffer'
      });

      fs.writeFileSync(output, img.data);

      await sock.sendMessage(remoteJid, {
        image: fs.readFileSync(output),
        caption: '✨ Anime IA aplicado (Space API)'
      }, { quoted: msg });

      fs.unlinkSync(input);
      fs.unlinkSync(output);

    } catch (err) {
      console.log('HF SPACE ERROR:', err.response?.data || err.message);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error con Space API anime. Intenta otra imagen.'
      }, { quoted: msg });
    }
  }
};
