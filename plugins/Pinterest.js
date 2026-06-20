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
    await sock.sendMessage(remoteJid, { text: `🔍 Buscando *${query}*...` }, { quoted: msg });

    // 🔥 SISTEMA ANTICAÍDAS: 3 APIs distintas. Si una falla, pasa a la siguiente.
    const apis = [
      `https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(query)}`,
      `https://api.agatz.xyz/api/pinterest?message=${encodeURIComponent(query)}`,
      `https://itzpire.com/search/pinterest?query=${encodeURIComponent(query)}`
    ];

    let images = [];

    for (const url of apis) {
      try {
        const response = await axios.get(url, { timeout: 5000 }); // 5 segundos máximo por API
        
        // Cada API devuelve la info con distinto nombre (data, result, etc), cubrimos todas:
        images = response.data.data || response.data.result || response.data;
        
        // Si logró extraer un array con enlaces de imágenes, detenemos la búsqueda
        if (Array.isArray(images) && images.length > 0) {
          break; 
        }
      } catch (error) {
        // Falla silenciosa: si esta API falló, no decimos nada y el ciclo intentará la siguiente
        continue;
      }
    }

    // Si después de buscar en las 3 APIs no hay nada...
    if (!images || images.length === 0) {
      return sock.sendMessage(remoteJid, { text: '❌ Las bases de datos de Pinterest están saturadas. Intenta en un rato.' }, { quoted: msg });
    }

    try {
      // Tomamos una imagen al azar del resultado exitoso
      const randomImage = images[Math.floor(Math.random() * images.length)];
      
      // Extraemos la URL final (a veces viene como string, a veces dentro de un objeto)
      const finalImageUrl = typeof randomImage === 'object' && randomImage.url ? randomImage.url : randomImage;

      await sock.sendMessage(
        remoteJid, 
        { 
          image: { url: finalImageUrl }, 
          caption: `📌 *Pinterest:* ${query}` 
        }, 
        { quoted: msg }
      );

    } catch (error) {
      console.error("Error enviando Pinterest:", error.message);
      await sock.sendMessage(remoteJid, { text: '❌ Error al intentar enviar la imagen al chat.' }, { quoted: msg });
    }
  }
};
