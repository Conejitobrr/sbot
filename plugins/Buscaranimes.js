'use strict';

const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
  commands: ['buscaranime', 'animes'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg } = ctx;

    if (args.length === 0) return sock.sendMessage(remoteJid, { text: '❌ Ejemplo: .buscaranime jujutsu kaisen 1' }, { quoted: msg });

    const query = args.join(' ');
    await sock.sendMessage(remoteJid, { text: `🔍 Buscando en Facebook: "${query}"...` }, { quoted: msg });

    try {
      // Buscamos solo en facebook.com
      const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent('site:facebook.com ' + query)}`;
      const { data } = await axios.get(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const $ = cheerio.load(data);
      
      // Capturamos el primer resultado de Facebook
      const primerEnlace = $('.b_algo h2 a').attr('href');

      if (!primerEnlace || !primerEnlace.includes('facebook.com')) {
        return sock.sendMessage(remoteJid, { text: '❌ No encontré resultados en Facebook.' }, { quoted: msg });
      }

      const respuesta = `✅ *Resultado encontrado (Facebook):*\n\n📥 *.descargar ${primerEnlace}*`;
      return sock.sendMessage(remoteJid, { text: respuesta }, { quoted: msg });

    } catch (e) {
      return sock.sendMessage(remoteJid, { text: '❌ Error al buscar en Facebook.' }, { quoted: msg });
    }
  }
};
