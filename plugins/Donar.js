'use strict';

module.exports = {
  commands: ['donar', 'apoyar', 'donate', 'dona'],

  async execute(ctx) {
    const {
      sock,
      msg,
      remoteJid,
      pushName
    } = ctx;

    const nombre = pushName || 'Usuario';

    const texto =
`💙 *APOYAR EL PROYECTO*

Hola *${nombre}* 👋

Si te gusta el bot y deseas apoyar su desarrollo, puedes hacerlo mediante PayPal.

👤 *Beneficiario:*
Jose Velazco

💰 *PayPal:*
https://www.paypal.com/paypalme/Josevelazc0

🙏 Gracias por tu apoyo.
Cada aporte ayuda a mantener y mejorar el bot.`;

    try {
      await sock.sendMessage(remoteJid, {
        text: texto
      }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error en donar:', err?.message || err);

      await sock.sendMessage(remoteJid, {
        text: '❌ Ocurrió un error mostrando la información de donación.'
      }, { quoted: msg });
    }
  }
};
