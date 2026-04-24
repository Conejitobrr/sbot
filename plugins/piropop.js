'use strict';

const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

module.exports = {
  commands: ['piropop'],

  async execute(ctx) {
    const { sock, remoteJid, msg, pushName } = ctx;

    let texto = '';

    try {
      const completion = await groq.chat.completions.create({
        model: 'mixtral-8x7b-32768', // ✅ ACTUAL
        messages: [
          {
            role: 'user',
            content: `Dame un piropo corto, romántico y creativo para alguien llamado ${pushName || 'bebé'}`
          }
        ]
      });

      texto = completion.choices[0].message.content;

    } catch (err) {
      console.log('ERROR GROQ:', err.message);

      // 🔁 fallback
      const piropos = [
        'Eres como wifi sin contraseña 😍',
        'Si la belleza fuera delito, ya estarías presa 💘',
        '¿Eres magia? Porque todo mejora contigo ✨',
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
