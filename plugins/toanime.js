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

      // 🔑 TOKEN HF
      const HF_API_KEY = process.env.HF_API_KEY;

      if (!HF_API_KEY) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Falta HF_API_KEY en .env'
        }, { quoted: msg });
      }

      // 🧠 MODELO ESTABLE (NO DEVUELVE HTML)
      const imageBuffer = fs.readFileSync(input);

      const response = await axios.post(
        'https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5',
        {
          inputs: imageBuffer.toString('base64'),
          parameters: {
            prompt: "anime style, high quality illustration, cinematic lighting, detailed face, soft shading, beautiful anime art"
          }
        },
        {
          headers: {
            Authorization: `Bearer ${HF_API_KEY}`,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer',
          timeout: 180000
        }
      );

      // 🔥 detectar error HTML
      const isHtml = Buffer.from(response.data).toString().includes('<html');

      if (isHtml) {
        throw new Error('HF devolvió HTML (modelo no disponible o saturado)');
      }

      fs.writeFileSync(output, response.data);

      await sock.sendMessage(remoteJid, {
        image: fs.readFileSync(output),
        caption: '✨ Anime IA aplicado con HuggingFace'
      }, { quoted: msg });

      fs.unlinkSync(input);
      fs.unlinkSync(output);

    } catch (err) {
      console.log('HF ANIME ERROR:', err.message || err);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error con IA anime. Modelo saturado o token inválido.'
      }, { quoted: msg });
    }
  }
};
