'use strict';

require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

module.exports = {
  commands: ['piropop'], // 👈 CAMBIADO AQUÍ
  description: 'Piropo con IA',

  async execute(ctx) {
    const { sock, remoteJid, msg } = ctx;

    let target;

    if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
      target = msg.message.extendedTextMessage.contextInfo.participant;
    } else if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
      target = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
    }

    if (!target) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Menciona o responde a alguien'
      }, { quoted: msg });
    }

    const numero = target.split('@')[0];

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: 'Eres experto en piropos creativos en español.' },
          { role: 'user', content: 'Dame un piropo corto y original.' }
        ],
        max_tokens: 60
      });

      const piropo = response.choices[0].message.content.trim();

      await sock.sendMessage(remoteJid, {
        text: `@${numero} ${piropo}`,
        mentions: [target]
      }, { quoted: msg });

    } catch (err) {
      console.log(err);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error con la IA'
      }, { quoted: msg });
    }
  }
};
