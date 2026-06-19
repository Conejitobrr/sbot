'use strict';

const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
  commands: ['buscaranime', 'animes'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg } = ctx;

    const input = args.join(' ');
    if (!input.includes('-')) {
      return sock.sendMessage(remoteJid, { text: '❌ Formato: .buscaranime jujutsu kaisen - 1' }, { quoted: msg });
    }

    const partes = input.split('-');
    const capitulo = partes.pop().trim();
    const nombreAnime = partes.join(' ').trim();

    await sock.sendMessage(remoteJid, { text: `🔍 *Motor Bing Activado...*\nRastreando los servidores de TokyVideo para "${nombreAnime}" Ep ${capitulo}.` }, { quoted: msg });

    try {
      // 🌐 Cambiamos DuckDuckGo por Bing (Mucho más amigable con los bots)
      const query = `site:tokyvideo.com "${nombreAnime}" capitulo ${capitulo} latino OR sub`;
      const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;

      const { data } = await axios.get(searchUrl, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'es-ES,es;q=0.9'
        }
      });

      const $ = cheerio.load(data);
      let links = [];

      // Bing guarda los resultados en etiquetas con la clase .b_algo
      $('.b_algo h2 a').each((i, el) => {
        const href = $(el).attr('href');
        if (href && href.includes('tokyvideo.com/video/') && links.length < 3) {
          links.push(href);
        }
      });

      if (!links.length) {
        return sock.sendMessage(remoteJid, { text: '❌ Bing no encontró resultados.\n\n💡 *Tip:* Intenta buscar solo el nombre corto. (Ej: .buscaranime naruto - 5)' }, { quoted: msg });
      }

      let respuestaFinal = `🎌 *RESULTADOS EN TOKYVIDEO* 🎌\n\n`;

      links.forEach((link, i) => {
        // Creamos un título limpio a partir de la URL
        const tituloLimpio = decodeURIComponent(link.split('/video/')[1]).replace(/-/g, ' ').toUpperCase();
        respuestaFinal += `🎬 *Opción ${i + 1}:* ${tituloLimpio}\n`;
        respuestaFinal += `📥 *Copia para descargar:*\n.descargar ${link}\n`;
        respuestaFinal += `━━━━━━━━━━━━━━━━━━\n\n`;
      });

      return sock.sendMessage(remoteJid, { text: respuestaFinal.trim() }, { quoted: msg });

    } catch (e) {
      console.log('❌ Error en buscador Bing:', e.message);
      return sock.sendMessage(remoteJid, { text: '❌ Ocurrió un error al conectar con el motor de búsqueda.' }, { quoted: msg });
    }
  }
};
