'use strict';

const axios = require('axios');

module.exports = {
  commands: ['pinterest', 'pin'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg } = ctx;

    if (!args.length) {
      return sock.sendMessage(
        remoteJid, 
        { text: '❌ *Uso correcto:* .pinterest [búsqueda]\n*Ejemplo:* .pinterest fondos de pantalla oscuros' }, 
        { quoted: msg }
      );
    }

    const query = args.join(' ');

    try {
      // API libre muy usada para bots de WhatsApp
      const url = `https://aemt.me/pinterest?query=${encodeURIComponent(query)}`;
      const response = await axios.get(url);

      let images = response.data.result || response.data;

      if (!images || images.length === 0) {
        return sock.sendMessage(remoteJid, { text: '❌ No encontré ninguna imagen en Pinterest con esa búsqueda.' }, { quoted: msg });
      }

      // Tomamos una imagen al azar de los resultados
      const randomImage = images[Math.floor(Math.random() * images.length)];

      await sock.sendMessage(
        remoteJid, 
        { 
          image: { url: randomImage }, 
          caption: `📌 *Pinterest:* ${query}` 
        }, 
        { quoted: msg }
      );

    } catch (error) {
      console.error("Error en Pinterest:", error.message);
      await sock.sendMessage(remoteJid, { text: '❌ Error al conectar con Pinterest.' }, { quoted: msg });
    }
  }
};
