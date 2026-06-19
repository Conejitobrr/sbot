'use strict';

const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
  commands: ['buscaranime', 'animes'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg } = ctx;

    if (args.length === 0) {
      return sock.sendMessage(remoteJid, { text: '❌ Escribe lo que buscas. Ejemplo: .buscaranime jujutsu kaisen 1' }, { quoted: msg });
    }

    const queryInput = args.join(' ');
    await sock.sendMessage(remoteJid, { text: `🔍 Buscando en TokyVideo: "${queryInput}"...` }, { quoted: msg });

    try {
      // Búsqueda simple y directa
      const query = `site:tokyvideo.com ${queryInput}`;
      const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;

      const { data } = await axios.get(searchUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });

      const $ = cheerio.load(data);
      let resultados = [];

      $('.b_algo').each((i, el) => {
        const title = $(el).find('h2').text().trim();
        const href = $(el).find('h2 a').attr('href');
        if (href && href.includes('tokyvideo.com/video/')) {
          resultados.push({ title, href });
        }
      });

      if (!resultados.length) {
        return sock.sendMessage(remoteJid, { text: '❌ No se encontró nada con ese término.' }, { quoted: msg });
      }

      let respuestaFinal = `🎌 *RESULTADOS BRUTOS* 🎌\n\n`;
      resultados.slice(0, 5).forEach((res, i) => {
        respuestaFinal += `*${i + 1}.* ${res.title}\n📥 *.descargar ${res.href}*\n\n`;
      });

      return sock.sendMessage(remoteJid, { text: respuestaFinal }, { quoted: msg });

    } catch (e) {
      return sock.sendMessage(remoteJid, { text: '❌ Error de búsqueda.' }, { quoted: msg });
    }
  }
};
