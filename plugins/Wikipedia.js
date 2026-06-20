'use strict';

const axios = require('axios');

module.exports = {
  commands: ['wiki', 'wikipedia'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg } = ctx;

    // 1. Verificamos que el usuario haya escrito algo
    if (!args.length) {
      return sock.sendMessage(
        remoteJid, 
        { text: '❌ Escribe lo que quieres buscar en Wikipedia.\n\n*Ejemplo:*\n.wiki Inteligencia artificial' }, 
        { quoted: msg }
      );
    }

    const query = args.join(' ');
    await sock.sendMessage(remoteJid, { text: `🔍 Buscando en Wikipedia: *"${query}"*...` }, { quoted: msg });

    try {
      // 2. Hacemos la consulta a la API de Wikipedia en español
      // Usamos el endpoint "summary" que nos da exactamente lo que necesitamos: resumen + imagen
      const url = `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
      const response = await axios.get(url);
      const data = response.data;

      // 3. Manejo de resultados ambiguos (ej. si buscan "Lima", puede ser la fruta, la ciudad, etc.)
      if (data.type === 'disambiguation') {
        return sock.sendMessage(
          remoteJid, 
          { text: `⚠️ Tu búsqueda es muy general y tiene varios significados. Intenta ser más específico.\n\n*Artículo:* ${data.title}` }, 
          { quoted: msg }
        );
      }

      // 4. Extraemos la información
      const extract = data.extract; // El texto resumido
      const title = data.title;     // El título oficial
      const wikiUrl = data.content_urls.desktop.page; // Link para leer completo
      const imageUrl = data.originalimage ? data.originalimage.source : null; // La imagen (si existe)

      // Armamos el texto final
      const finalMessage = `📚 *${title}*\n\n${extract}\n\n🔗 *Leer más:* ${wikiUrl}`;

      // 5. Lógica de envío: Si hay imagen manda foto + texto, si no, solo texto
      if (imageUrl) {
        await sock.sendMessage(
          remoteJid, 
          { 
            image: { url: imageUrl }, 
            caption: finalMessage 
          }, 
          { quoted: msg }
        );
      } else {
        await sock.sendMessage(
          remoteJid, 
          { text: finalMessage }, 
          { quoted: msg }
        );
      }

    } catch (error) {
      // Si la API responde con 404, es que no encontró nada
      if (error.response && error.response.status === 404) {
        return sock.sendMessage(
          remoteJid, 
          { text: '❌ No encontré ningún artículo exacto con ese nombre. Revisa la ortografía o intenta con sinónimos.' }, 
          { quoted: msg }
        );
      }
      
      console.error("Error en plugin wikipedia:", error.message);
      return sock.sendMessage(
        remoteJid, 
        { text: '❌ Ocurrió un error al intentar conectarse con Wikipedia.' }, 
        { quoted: msg }
      );
    }
  }
};
