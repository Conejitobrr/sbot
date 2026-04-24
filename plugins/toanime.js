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

      // 🔑 HUGGINGFACE TOKEN
      const HF_API_KEY = process.env.HF_API_KEY;

      if (!HF_API_KEY) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Falta HF_API_KEY en .env'
        }, { quoted: msg });
      }

      // 🧠 MODELO ANIME ESTABLE
      const imageBuffer = fs.readFileSync(input);

      const response = await axios.post(
        'https://api-inference.huggingface.co/models/lambdalabs/sd-image-variations-diffusers',
        imageBuffer,
        {
          headers: {
            Authorization: `Bearer ${HF_API_KEY}`,
            'Content-Type': 'application/octet-stream'
          },
          responseType: 'arraybuffer',
          timeout: 120000
        }
      );

      fs.writeFileSync(output, response.data);

      await sock.sendMessage(remoteJid, {
        image: fs.readFileSync(output),
        caption: '✨ Anime IA aplicado (modo estable)'
      }, { quoted: msg });

      fs.unlinkSync(input);
      fs.unlinkSync(output);

    } catch (err) {
      console.log('HF ANIME ERROR:', err.response?.data || err.message);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error con IA anime. Intenta otra imagen.'
      }, { quoted: msg });
    }
  }
};
