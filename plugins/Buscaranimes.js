'use strict';

const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
  commands: ['buscaranime', 'animes'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg } = ctx;

    if (args.length === 0) return sock.sendMessage(remoteJid, { text: '❌ Ejemplo: .buscaranime jujutsu kaisen 04' }, { quoted: msg });

    const query = args.join(' ');
    await sock.sendMessage(remoteJid, { text: `🔍 Buscando enlaces públicos para: "${query}"...` }, { quoted: msg });

    try {
      // Quitamos el site:facebook para buscar en todo Internet, 
      // pero mantenemos términos clave para que aparezcan videos de Facebook/TokyVideo/etc.
      const busqueda = `${query} video latino OR sub online`;
      const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(busqueda)}`;
      
      const { data } = await axios.get(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const $ = cheerio.load(data);
      
      let resultados = [];
      $('.b_algo h2 a').each((i, el) => {
        const href = $(el).attr('href');
        const title = $(el).text();
        // Aceptamos Facebook, TokyVideo o cualquier plataforma de video pública
        if (href && (href.includes('facebook.com') || href.includes('tokyvideo.com'))) {
          resultados.push({ title, href });
        }
      });

      if (resultados.length === 0) {
        return sock.sendMessage(remoteJid, { text: '❌ No se encontraron videos públicos. Intenta con un término más corto.' }, { quoted: msg });
      }

      const respuesta = `✅ *Resultados encontrados:*\n\n1. ${resultados[0].title}\n📥 *.descargar ${resultados[0].href}*`;
      return sock.sendMessage(remoteJid, { text: respuesta }, { quoted: msg });

    } catch (e) {
      return sock.sendMessage(remoteJid, { text: '❌ Error al buscar.' }, { quoted: msg });
    }
  }
};
