'use strict';

module.exports = {
  commands: ['piropo'],
  description: 'Envía un piropo aleatorio',
  category: 'general',

  ownerOnly  : false,
  rownOnly   : false,
  adminOnly  : false,
  groupOnly  : false,
  privateOnly: false,
  premiumOnly: false,
  botAdmin   : false,
  restrict   : false,

  async execute(ctx) {
    const { sock, remoteJid } = ctx;

    const piropos = [
      'Me gustaría ser papel para poder envolver ese bombón.',
      'Eres como wifi sin contraseña, todo el mundo te busca',
      'Quién fuera bus para andar por las curvas de tu corazón.',
      'Quiero volar sin alas y salir de este universo, entrar en el tuyo y amarte en silencio.',
      'Quisiera ser mantequilla para derretirme en tu arepa.',
      'Si la belleza fuera pecado vos ya estarías en el infierno.',
      'Me gustaría ser un gato para pasar 7 vidas a tu lado.',
      'Robar está mal pero un beso de tu boca sí me lo robaría.',
      'Qué hermoso es el cielo cuando está claro pero más hermoso es el amor cuando te tengo a mi lado.',
      'Bonita, camina por la sombra, el sol derrite los chocolates.',
      'Si fuera un correo electrónico serías mi contraseña.',
      'Quisiera que fueses monte para darte machete.',
      'Perdí mi número de teléfono ¿Me das el tuyo?',
      '¿Cómo te llamas para pedirte de regalo a Santa Claus?',
      'En el cielo hay muchas estrellas, pero la más brillante está en la Tierra y eres tú.',
      '¿Acaba de salir el sol o es la sonrisa que me regalas hoy?',
      'No es el ron ni la cerveza, eres tú quien se me ha subido a la cabeza.',
      'Si hablamos de matemáticas eres la suma de todos mis deseos.',
      'Pareces Google porque tienes todo lo que yo busco.',
      'Mi café favorito es el de tus ojos.',
      'Quiero ser Photoshop para retocarte todo el cuerpo.',
      'Quisiera que fueras cereal para cucharearte en las mañanas.',
      'Quién fuera hambre para darte tres veces al día.'
    ];

    const pickRandom = (list) => list[Math.floor(Math.random() * list.length)];

    const texto = pickRandom(piropos);

    await sock.sendMessage(remoteJid, { text: texto });
  }
};
