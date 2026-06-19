'use strict';

module.exports = {
  commands: ['imagina', 'dibujar', 'imagen'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg, sender } = ctx;

    try {
      if (!args.length) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Dime qué quieres que dibuje.\n\nEjemplo:\n.imagina un perro astronauta en la luna'
        }, { quoted: msg });
      }

      const prompt = args.join(' ');

      await sock.sendMessage(remoteJid, {
        text: '🎨 *Pintando tu idea...* dame unos segundos.'
      }, { quoted: msg });

      // Pollinations genera imágenes gratis con solo pasarle el texto en la URL
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;

      await sock.sendMessage(remoteJid, {
        image: { url: imageUrl },
        caption: `🎨 *Imaginado:* ${prompt}\n👤 *Pedido por:* @${sender.split('@')[0]}`,
        mentions: [sender]
      }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error en imagina.js:', err);
      await sock.sendMessage(remoteJid, {
        text: '❌ Hubo un error al generar la imagen. Intenta con otra descripción.'
      }, { quoted: msg });
    }
  }
};
