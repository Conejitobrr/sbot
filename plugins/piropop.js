'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports = {
  commands: ['piropop'],

  async execute(ctx) {
    const { sock, remoteJid, msg } = ctx;

    let texto = '';

    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-pro' // 👈 ESTE SÍ FUNCIONA
      });

      const result = await model.generateContent(
        'Dame un piropo corto, romántico y creativo'
      );

      texto = result.response.text();

    } catch (err) {
      console.log('ERROR GEMINI:', err.message);

      // 🔁 fallback
      const piropos = [
        'Eres como wifi sin contraseña 😍',
        'Si la belleza fuera delito, ya estarías presa 💘',
        '¿Eres magia? Porque todo mejora contigo ✨',
        'Eres la razón de mi sonrisa 😊',
        'No eres Google, pero tienes todo lo que busco ❤️'
      ];

      texto = piropos[Math.floor(Math.random() * piropos.length)];
    }

    await sock.sendMessage(remoteJid, {
      text: texto
    }, {
      quoted: msg
    });
  }
};
