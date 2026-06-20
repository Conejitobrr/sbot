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
      // 1. Buscador inteligente
      const searchUrl = `https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json`;
      const searchResponse = await axios.get(searchUrl, {
        headers: { 'User-Agent': 'SiriusBot/1.0' }
      });

      const searchResults = searchResponse.data.query.search;
      
      if (!searchResults || searchResults.length === 0) {
        return sock.sendMessage(remoteJid, { text: '❌ No se encontró ningún artículo relacionado con tu búsqueda.' }, { quoted: msg });
      }

      const exactTitle = searchResults[0].title;

      // 2. Extraer el artículo exacto
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

      // 3. Descargar y enviar la imagen manualmente para evitar el Error 403
      let imagenEnviada = false;

      if (imageUrl) {
        try {
          // Descargamos la imagen nosotros mismos con el User-Agent correcto
          const imageResponse = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            headers: { 'User-Agent': 'SiriusBot/1.0' }
          });
          
          const bufferImagen = Buffer.from(imageResponse.data, 'binary');

          // Entregamos la imagen ya procesada a WhatsApp
          await sock.sendMessage(remoteJid, { 
            image: bufferImagen, 
            caption: textoFinal 
          }, { quoted: msg });
          
          imagenEnviada = true;
        } catch (imgError) {
          console.error("No se pudo descargar la imagen, enviando texto plano:", imgError.message);
        }
      }

      // 4. PLAN B: Si no hay imagen o dio error al descargarla, enviamos solo el texto
      if (!imagenEnviada) {
        await sock.sendMessage(remoteJid, { text: textoFinal }, { quoted: msg });
      }

    } catch (error) {
      console.error("Error Wikipedia:", error.message);
      await sock.sendMessage(remoteJid, { text: '❌ Ocurrió un error al procesar tu búsqueda. Intenta con otra palabra.' }, { quoted: msg });
    }
  }
};
