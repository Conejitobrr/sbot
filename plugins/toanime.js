'use strict';

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const Replicate = require('replicate');
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

      // 🔑 TOKEN DESDE .env
      const token = process.env.REPLICATE_API_TOKEN;

      if (!token) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Falta REPLICATE_API_TOKEN en .env'
        }, { quoted: msg });
      }

      const replicate = new Replicate({
        auth: token
      });

      const imageBase64 = fs.readFileSync(input, { encoding: 'base64' });

      // 🧠 MODELO REAL QUE SÍ EXISTE
      const result = await replicate.run(
        "bytedance/sdxl-lightning",
        {
          input: {
            prompt: "anime style, high quality illustration, cinematic lighting, ultra detailed face, soft shading, beautiful anime art",
            image: `data:image/jpeg;base64,${imageBase64}`,
            strength: 0.75
          }
        }
      );

      const imageUrl = Array.isArray(result) ? result[0] : result;

      const img = await axios.get(imageUrl, {
        responseType: 'arraybuffer'
      });

      fs.writeFileSync(output, img.data);

      await sock.sendMessage(remoteJid, {
        image: fs.readFileSync(output),
        caption: '✨ Anime IA PRO aplicado'
      }, { quoted: msg });

      fs.unlinkSync(input);
      fs.unlinkSync(output);

    } catch (err) {
      console.log('ANIME API ERROR:', err.response?.data || err.message);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error con IA anime. Revisa token o conexión.'
      }, { quoted: msg });
    }
  }
};
