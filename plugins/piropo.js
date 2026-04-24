'use strict';

module.exports = {
  commands: ['piropo'],
  description: 'Envía un piropo aleatorio',

  async execute(ctx) {
    const { sock, remoteJid, msg } = ctx;

    const piropos = [
      'Me gustaría ser papel para poder envolver ese bombón.',
      'Eres como wifi sin contraseña, todo el mundo te busca.',
      'Quién fuera bus para andar por las curvas de tu corazón.',
      'Quiero volar sin alas y entrar en tu universo.',
      'Quisiera ser mantequilla para derretirme en tu arepa.',
      'Si la belleza fuera pecado, ya estarías en el infierno.',
      'Me gustaría ser un gato para pasar 7 vidas a tu lado.',
      'Robar está mal, pero un beso tuyo sí me lo robaría.',
      'Bonita, camina por la sombra que el sol derrite chocolates.',
      'Pareces Google, tienes todo lo que busco.',
      'No es el ron ni la cerveza, eres tú quien se me ha subido a la cabeza.',
      'Si hablamos de matemáticas eres la suma de todos mis deseos.',
      'Mi café favorito es el de tus ojos.',
      'Quiero ser Photoshop para retocarte todo el cuerpo.',
      'Quisiera que fueras cereal para cucharearte en las mañanas.',
      'Quién fuera hambre para darte tres veces al día.'
    ];

    const random = piropos[Math.floor(Math.random() * piropos.length)];

    await sock.sendMessage(remoteJid, {
      text: random
    }, {
      quoted: msg // 👈 responde al mensaje
    });
  }
};
