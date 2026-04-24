'use strict';

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const Replicate = require('replicate');
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

      // 🔑 TOKEN DESDE .env (NO GITHUB HARD CODE)
      const token = process.env.REPLICATE_API_TOKEN;

      if (!token) {
        return sock.sendMessage(remoteJid, {
          text: '❌ No hay API key configurada en .env'
        }, { quoted: msg });
      }

      const replicate = new Replicate({
        auth: token
      });

      const imageBase64 = fs.readFileSync(input, { encoding: 'base64' });

      const result = await replicate.run(
        "cjwbw/anything-v4.0-img2img",
        {
          input: {
            image: `data:image/jpeg;base64,${imageBase64}`,
            prompt: "anime style, ultra detailed face, cinematic lighting, high quality illustration, soft shading",
            strength: 0.75
          }
        }
      );

      const imageUrl = result[0];

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
        text: '❌ Error con IA anime. Revisa tu API key o conexión.'
      }, { quoted: msg });
    }
  }
};
