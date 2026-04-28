'use strict';

module.exports = {
  commands: ['fake'],

  async execute(ctx) {
    const { sock, msg, remoteJid } = ctx;

    try {
      const text = msg.message?.conversation ||
                   msg.message?.extendedTextMessage?.text || '';

      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

      if (!text || !mentioned.length) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Usa: .fake @usuario texto | respuesta'
        }, { quoted: msg });
      }

      // quitar comando
      const clean = text.replace(/\.fake\s*/i, '').trim();

      let [fakeText, replyText] = clean.split('|').map(v => v.trim());

      if (!fakeText || !replyText) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Formato: .fake @usuario texto | respuesta'
        }, { quoted: msg });
      }

      // 🧠 usar el usuario mencionado
      const user = mentioned[0];

      // ❌ quitar @usuario del texto fake
      fakeText = fakeText.replace(/@\S+/g, '').trim();

      // 🧠 mensaje falso REALISTA
      const fakeQuoted = {
        key: {
          fromMe: false,
          participant: user,
          remoteJid
        },
        message: {
          conversation: fakeText
        }
      };

      // 📩 respuesta citando al usuario mencionado
      await sock.sendMessage(remoteJid, {
        text: replyText,
        mentions: [user]
      }, { quoted: fakeQuoted });

    } catch (e) {
      console.log('❌ ERROR fake:', e);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error en comando'
      }, { quoted: msg });
    }
  }
};
