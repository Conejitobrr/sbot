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

    const nombre = pushName || 'Aventurero';

    const texto =
`💙 *¡APOYA EL PROYECTO!* 🐾

¡Hola, *${nombre}*! 👋

¿Te gusta cómo funciona el bot, los juegos y las funciones que trae? ✨

Mantener este proyecto en línea 24/7 y desarrollar nuevas actualizaciones tiene sus costos (y lamentablemente, los servidores aún no aceptan XP de la mina como método de pago 😅).

Si te nace apoyar el desarrollo y quieres que el bot siga evolucionando, puedes invitarme un aporte por aquí:

💳 *Mi PayPal:*
👉 https://www.paypal.com/paypalme/Josevelazc0
👤 *Jose Velazco*

✨ _PD: Tu apoyo va directo a pagar el hosting, mi café y, sobre todo, la comida de mis wawas (que sinceramente gastan más en mantenimiento que el mismísimo servidor)._ 🐶🐾

¡Gracias por ser parte de esta comunidad!`;

    try {
      // Reacción automática con perrito
      try {
        await sock.sendMessage(remoteJid, {
          react: { text: '🐶', key: msg.key }
        });
      } catch (e) {}

      // Envío del mensaje
      await sock.sendMessage(remoteJid, {
        text: texto
      }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error en donar:', err?.message || err);

      await sock.sendMessage(remoteJid, {
        text: '❌ Ocurrió un error mostrando la información de donación. (Pero la intención cuenta 🐶)'
      }, { quoted: msg });
    }
  }
};
