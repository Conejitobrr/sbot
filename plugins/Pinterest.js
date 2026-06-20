'use strict';

const gis = require('g-i-s');

module.exports = {
  commands: ['pinterest', 'pin'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg } = ctx;

    if (!args.length) {
      return sock.sendMessage(
        remoteJid, 
        { text: '❌ *Uso correcto:* .pinterest [búsqueda]' }, 
        { quoted: msg }
      );
    }

    const query = args.join(' ');
    await sock.sendMessage(remoteJid, { text: `🔍 Extrayendo *${query}* vía Google...` }, { quoted: msg });

    try {
      // EL TRUCO: Buscamos en Google, pero limitamos los resultados estrictamente al dominio de Pinterest
      const searchTerm = `${query} site:pinterest.com`;

      // Convertimos la función de la librería en una Promesa para que Node.js la espere
      const images = await new Promise((resolve, reject) => {
        gis(searchTerm, (error, results) => {
          if (error) reject(error);
          else resolve(results);
        });
      });

      if (!images || images.length === 0) {
        return sock.sendMessage(remoteJid, { text: '❌ No encontré ninguna imagen en Pinterest con esa búsqueda.' }, { quoted: msg });
      }

      // Tomamos una de las primeras 10 imágenes al azar para garantizar que sea relevante y de buena calidad
      const topResults = images.slice(0, 10);
      const randomImage = topResults[Math.floor(Math.random() * topResults.length)];

      await sock.sendMessage(
        remoteJid, 
        { 
          image: { url: randomImage.url }, 
          caption: `📌 *Pinterest:* ${query}` 
        }, 
        { quoted: msg }
      );

    } catch (error) {
      console.error("Error en Pinterest (Google Images):", error);
      await sock.sendMessage(remoteJid, { text: '❌ Ocurrió un error al procesar la imagen.' }, { quoted: msg });
    }
  }
};
