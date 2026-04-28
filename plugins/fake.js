'use strict';

module.exports = {
  commands: ['fake'],

  async execute(ctx) {
    const { sock, msg, remoteJid, sender } = ctx;

    try {
      const text = msg.message?.conversation || 
                   msg.message?.extendedTextMessage?.text || '';

      if (!text) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Escribe el texto\nEjemplo: .fake Soy gay | No sabía :0'
        }, { quoted: msg });
      }

      // separar mensaje fake y respuesta
      let [fakeText, replyText] = text.split('|').map(v => v.trim());

      if (!fakeText || !replyText) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Usa: .fake textoFake | respuesta'
        }, { quoted: msg });
      }

      // 🧠 crear mensaje falso (como si fuera otra persona)
      const fakeQuoted = {
        key: {
          fromMe: false,
          participant: '1234567890@s.whatsapp.net', // 👤 número fake
          remoteJid
        },
        message: {
          conversation: fakeText
        }
      };

      // 📩 enviar respuesta citando el fake
      await sock.sendMessage(remoteJid, {
        text: replyText
      }, { quoted: fakeQuoted });

    } catch (e) {
      console.log('❌ ERROR fake:', e);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error en comando'
      }, { quoted: msg });
    }
  }
};
