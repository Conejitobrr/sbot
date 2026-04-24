'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
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
          text: 'Responde a una imagen con .toanime'
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

      // 🔥 TU API KEY (CREAR EN DEEPAI)
      const API_KEY = '66a1401d-3e3b-42f5-ab9f-a4e15db5044a';

      const form = new FormData();
      form.append('image', fs.createReadStream(input));

      const response = await axios.post(
        'https://api.deepai.org/api/toonify',
        form,
        {
          headers: {
            ...form.getHeaders(),
            'api-key': API_KEY
          }
        }
      );

      const imageUrl = response.data.output_url;

      const result = await axios.get(imageUrl, {
        responseType: 'arraybuffer'
      });

      fs.writeFileSync(output, result.data);

      await sock.sendMessage(remoteJid, {
        image: fs.readFileSync(output),
        caption: '✨ Anime IA aplicado'
      }, { quoted: msg });

      fs.unlinkSync(input);
      fs.unlinkSync(output);

    } catch (err) {
      console.log('ANIME API ERROR:', err.response?.data || err.message);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error con API anime'
      }, { quoted: msg });
    }
  }
};
