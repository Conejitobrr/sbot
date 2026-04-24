'use strict';

module.exports = {
  commands: ['piropo'],
  description: 'Envía un piropo mencionando a alguien',

  async execute(ctx) {
    const { sock, remoteJid, msg } = ctx;

    const piropos = [
      'Me gustaría ser papel para poder envolver ese bombón.',
      'Eres como wifi sin contraseña, todo el mundo te busca.',
      'Quién fuera bus para andar por las curvas de tu corazón.',
      'Quiero volar sin alas y entrar en tu universo.',
      'Quisiera ser mantequilla para derretirme en tu arepa.',
      'Si la belleza fuera pecado, ya estarías en el infierno.',
      'Robar está mal, pero un beso tuyo sí me lo robaría.',
      'Bonita, camina por la sombra que el sol derrite chocolates.',
      'Pareces Google, tienes todo lo que busco.',
      'Mi café favorito es el de tus ojos.'
    ];

    const random = piropos[Math.floor(Math.random() * piropos.length)];

    // 🔥 Detectar usuario mencionado o respondido
    let target;

    // si responde a alguien
    if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
      target = msg.message.extendedTextMessage.contextInfo.participant;
    }
    // si menciona con @
    else if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
      target = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
    }

    // ❌ si no hay usuario
    if (!target) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Menciona o responde a alguien para enviarle un piropo'
      }, { quoted: msg });
    }

    const numero = target.split('@')[0];

    // 💌 enviar piropo con mención
    await sock.sendMessage(remoteJid, {
      text: `@${numero} ${random}`,
      mentions: [target]
    }, { quoted: msg });
  }
};
