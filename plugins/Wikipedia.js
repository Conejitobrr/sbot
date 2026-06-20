'use strict';

const axios = require('axios');

module.exports = {
  commands: ['wiki', 'wikipedia'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg } = ctx;

    // 1. Verificación de argumentos
    if (!args || args.length === 0) {
      return sock.sendMessage(
        remoteJid, 
        { text: '❌ *Uso correcto:* .wiki [búsqueda]\nEjemplo: .wiki Lima' }, 
        { quoted: msg }
      );
    }

    const query = args.join(' ');
    
    // Notificación de carga
    await sock.sendMessage(remoteJid, { text: `🔍 Consultando Wikipedia: *${query}*...` }, { quoted: msg });

    try {
      // 2. Configuración de la petición con User-Agent (vital para evitar rechazos)
      const url = `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'SiriusBot/1.0 (Contact: admin@bot.com)'
        }
      });

      const data = response.data;

      // 3. Manejo de ambigüedad
      if (data.type === 'disambiguation') {
        return sock.sendMessage(
          remoteJid, 
          { text: `⚠️ La búsqueda *${query}* tiene múltiples significados. Sé más específico.` }, 
          { quoted: msg }
        );
      }

      // 4. Preparación del mensaje
      const title = data.title || "Sin título";
      const extract = data.extract || "No se encontró descripción.";
      const wikiUrl = data.content_urls?.desktop?.page || "https://es.wikipedia.org/";
      const imageUrl = data.originalimage?.source || null;

      const textoFinal = `📚 *${title}*\n\n${extract}\n\n🔗 *Leer más:* ${wikiUrl}`;

      // 5. Envío condicional (Imagen + Texto o solo Texto)
      if (imageUrl) {
        await sock.sendMessage(remoteJid, { 
          image: { url: imageUrl }, 
          caption: textoFinal 
        }, { quoted: msg });
      } else {
        await sock.sendMessage(remoteJid, { text: textoFinal }, { quoted: msg });
      }

    } catch (error) {
      console.error("Error Wikipedia:", error.message);
      
      // Mensaje técnico para el usuario
      const errorMsg = error.response?.status === 404 
        ? '❌ Artículo no encontrado.' 
        : '❌ Wikipedia no respondió correctamente.';
        
      await sock.sendMessage(remoteJid, { text: errorMsg }, { quoted: msg });
    }
  }
};
