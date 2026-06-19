'use strict';

const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
  commands: ['buscaranime', 'animes'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg } = ctx;

    if (args.length === 0) return sock.sendMessage(remoteJid, { text: '❌ Ejemplo: .buscaranime jujutsu kaisen 04' }, { quoted: msg });

    const query = args.join(' ');
    await sock.sendMessage(remoteJid, { text: `🔍 Buscando en la web: "${query}"...` }, { quoted: msg });

    try {
      // Usamos el motor de DuckDuckGo que es el más amigable para bots
      // Le pedimos que busque específicamente en Facebook
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent('site:facebook.com ' + query)}`;
      
      const { data } = await axios.get(searchUrl, { 
        headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36' 
        } 
      });

      const $ = cheerio.load(data);
      let resultados = [];

      // DuckDuckGo usa la clase 'result__url' para los enlaces
      $('.result__url').each((i, el) => {
        const href = $(el).attr('href');
        if (href && href.includes('facebook.com')) {
          resultados.push(href);
        }
      });

      if (resultados.length === 0) {
        return sock.sendMessage(remoteJid, { text: '❌ No se encontraron videos. Intenta un término más corto.' }, { quoted: msg });
      }

      // Tomamos el primer resultado que es el más relevante
      const respuesta = `✅ *Resultado encontrado en Facebook:*\n\n📥 *.descargar ${resultados[0]}*`;
      return sock.sendMessage(remoteJid, { text: respuesta }, { quoted: msg });

    } catch (e) {
      return sock.sendMessage(remoteJid, { text: '❌ Error al buscar en la web.' }, { quoted: msg });
    }
  }
};
