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

    await sock.sendMessage(remoteJid, { text: `🔍 *Extrayendo información...*\nBuscando sinopsis y enlaces para "${nombreAnime}" Ep ${capitulo}.` }, { quoted: msg });

    try {
      const query = encodeURIComponent(`${nombreAnime} capitulo ${capitulo} latino`);
      const searchUrl = `https://www.tokyvideo.com/es/search?q=${query}`;

      const { data } = await axios.get(searchUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });

      const $ = cheerio.load(data);
      let links = [];

      // Obtenemos los primeros 2 resultados de la búsqueda
      $('.video-list-item a').each((i, el) => {
        const href = $(el).attr('href');
        if (href && href.includes('/video/') && links.length < 2) {
          links.push(href);
        }
      });

      if (!links.length) {
        return sock.sendMessage(remoteJid, { text: '❌ No se encontraron capítulos con ese nombre. Intenta buscar solo el nombre del anime.' }, { quoted: msg });
      }

      let respuestaFinal = `🎌 *RESULTADOS ENCONTRADOS* 🎌\n\n`;

      // Entramos a cada enlace para robar el título oficial y el resumen
      for (let i = 0; i < links.length; i++) {
        const videoRes = await axios.get(links[i], { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $vid = cheerio.load(videoRes.data);
        
        const title = $vid('meta[property="og:title"]').attr('content') || $vid('title').text();
        let desc = $vid('meta[property="og:description"]').attr('content') || 'Sin resumen disponible.';
        
        // Limpiamos el texto si es muy largo
        if (desc.length > 200) desc = desc.substring(0, 200) + '...';

        respuestaFinal += `🎬 *Opción ${i + 1}:* ${title}\n`;
        respuestaFinal += `📝 *Sinopsis:* ${desc}\n\n`;
        respuestaFinal += `📥 *Copia y pega esto para descargar:*\n.descargar ${links[i]}\n`;
        respuestaFinal += `━━━━━━━━━━━━━━━━━━\n\n`;
      }

      return sock.sendMessage(remoteJid, { text: respuestaFinal.trim() }, { quoted: msg });

    } catch (e) {
      console.log('Error en buscador:', e.message);
      return sock.sendMessage(remoteJid, { text: '❌ Error al procesar la búsqueda.' }, { quoted: msg });
    }
  }
};
