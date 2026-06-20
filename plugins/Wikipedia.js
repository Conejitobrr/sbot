'use strict';

const axios = require('axios');

module.exports = {
  commands: ['wiki', 'wikipedia'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg } = ctx;

    if (!args || args.length === 0) {
      return sock.sendMessage(
        remoteJid, 
        { text: '❌ *Uso correcto:* .wiki [búsqueda]\nEjemplo: .wiki Albert Einstein' }, 
        { quoted: msg }
      );
    }

    const query = args.join(' ');
    await sock.sendMessage(remoteJid, { text: `🔍 Buscando en Wikipedia: *${query}*...` }, { quoted: msg });

    try {
      // PASO 1: Buscador inteligente (corrige ortografía y encuentra el título exacto)
      const searchUrl = `https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json`;
      const searchResponse = await axios.get(searchUrl, {
        headers: { 'User-Agent': 'SiriusBot/1.0' }
      });

      const searchResults = searchResponse.data.query.search;
      
      if (!searchResults || searchResults.length === 0) {
        return sock.sendMessage(remoteJid, { text: '❌ No se encontró ningún artículo relacionado con tu búsqueda.' }, { quoted: msg });
      }

      // Tomamos el título del mejor resultado
      const exactTitle = searchResults[0].title;

      // PASO 2: Ahora sí, pedimos el resumen y la foto de ese artículo exacto
      const summaryUrl = `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(exactTitle)}`;
      const summaryResponse = await axios.get(summaryUrl, {
        headers: { 'User-Agent': 'SiriusBot/1.0' }
      });

      const data = summaryResponse.data;

      if (data.type === 'disambiguation') {
        return sock.sendMessage(
          remoteJid, 
          { text: `⚠️ La búsqueda *${exactTitle}* tiene múltiples significados. Sé más específico.` }, 
          { quoted: msg }
        );
      }

      const title = data.title || exactTitle;
      const extract = data.extract || "No se encontró descripción exacta.";
      const wikiUrl = data.content_urls?.desktop?.page || `https://es.wikipedia.org/wiki/${encodeURIComponent(exactTitle)}`;
      const imageUrl = data.originalimage?.source || null;

      const textoFinal = `📚 *${title}*\n\n${extract}\n\n🔗 *Leer más:* ${wikiUrl}`;

      // PASO 3: Enviamos la imagen o solo el texto
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
      await sock.sendMessage(remoteJid, { text: '❌ Ocurrió un error al procesar tu búsqueda. Intenta con otra palabra.' }, { quoted: msg });
    }
  }
};
