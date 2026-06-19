'use strict';

module.exports = {
  // Estos son solo los nombres con los que la gente activa este comando
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
`╭─💖「 *APOYA AL PROYECTO* 」
│
│ ¡Hola, *${nombre}*! 👋
│ 
│ ¿Te divierte usar el bot? 🎮
│ Gracias a ti, nuestra comunidad 
│ disfruta de cientos de funciones:
│ juegos, economía, mascotas, 
│ moderación automática y mucho más. ✨
│
│ Mantener este bot encendido 24/7
│ para todos cuesta dinero (y los 
│ servidores no aceptan XP como 
│ forma de pago 😅).
│
│ Si quieres que el bot siga creciendo,
│ añadiendo nuevos comandos y no 
│ termine apagándose, ¡toda ayuda suma!
│
│ 💳 *PayPal:*
│ https://www.paypal.com/paypalme/Josevelazc0
│ 👤 *A nombre de:* Jose Velazco
│
│ ✨ _Con tu aporte ayudas a pagar el_
│ _hosting, el café del creador y el_
│ _mantenimiento del sistema._ ☕💻
│
╰─────────────────`;

    try {
      try {
        await sock.sendMessage(remoteJid, {
          react: { text: '💙', key: msg.key }
        });
      } catch (e) {}

      await sock.sendMessage(remoteJid, {
        text: texto
      }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error en donar:', err?.message || err);

      await sock.sendMessage(remoteJid, {
        text: '❌ Ocurrió un error mostrando la información de donación. (Pero la intención cuenta 💙)'
      }, { quoted: msg });
    }
  }
};
