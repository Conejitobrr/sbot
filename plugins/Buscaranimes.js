'use strict';

const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
  commands: ['buscaranime', 'animes'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg } = ctx;

    if (args.length === 0) return sock.sendMessage(remoteJid, { text: '❌ Ejemplo: .buscaranime jujutsu kaisen 1' }, { quoted: msg });

    const query = args.join(' ');
    await sock.sendMessage(remoteJid, { text: `🔍 Buscando el primer resultado para: "${query}"...` }, { quoted: msg });

    try {
      // Búsqueda directa en Bing
      const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent('site:tokyvideo.com ' + query)}`;
      const { data } = await axios.get(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const $ = cheerio.load(data);
      
      // Tomamos el primer enlace de la lista de Bing
      const primerEnlace = $('.b_algo h2 a').attr('href');

      if (!primerEnlace || !primerEnlace.includes('tokyvideo.com/video/')) {
        return sock.sendMessage(remoteJid, { text: '❌ No encontré resultados en Bing para esa búsqueda.' }, { quoted: msg });
      }

      // Enviamos el resultado directo
      const respuesta = `✅ *Resultado encontrado (TokyVideo):*\n\n📥 *.descargar ${primerEnlace}*`;
      return sock.sendMessage(remoteJid, { text: respuesta }, { quoted: msg });

    } catch (e) {
      return sock.sendMessage(remoteJid, { text: '❌ Error al buscar en Bing.' }, { quoted: msg });
    }
  }
};
