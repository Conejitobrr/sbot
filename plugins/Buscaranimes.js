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

    await sock.sendMessage(remoteJid, { text: `🔍 *Conectando al Proxy Inverso...*\nBuscando sinopsis y enlaces para "${nombreAnime}" Ep ${capitulo}.` }, { quoted: msg });

    try {
      // 🛡️ Envolvemos la búsqueda en AllOrigins para evitar el bloqueo de IP de TokyVideo
      const query = encodeURIComponent(`${nombreAnime} capitulo ${capitulo} latino`);
      const searchUrl = `https://www.tokyvideo.com/es/search?q=${query}`;
      const proxySearchUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(searchUrl)}`;

      const { data } = await axios.get(proxySearchUrl, { timeout: 15000 });
      const html = data.contents; // El proxy nos devuelve el HTML puro
      const $ = cheerio.load(html);
      
      let links = [];

      // Cazamos todos los enlaces de video que salgan en la búsqueda
      $('a').each((i, el) => {
        let href = $(el).attr('href');
        if (href && href.includes('/video/')) {
          if (!href.startsWith('http')) href = 'https://www.tokyvideo.com' + href;
          if (!links.includes(href) && links.length < 2) {
            links.push(href);
          }
        }
      });

      if (!links.length) {
        return sock.sendMessage(remoteJid, { text: '❌ No se encontraron capítulos. Intenta con un nombre más corto (Ej: .buscaranime jujutsu kaisen - 1)' }, { quoted: msg });
      }

      let respuestaFinal = `🎌 *RESULTADOS ENCONTRADOS* 🎌\n\n`;

      // 🛡️ Volvemos a usar el Proxy para entrar a cada enlace y robar el resumen sin ser detectados
      for (let i = 0; i < links.length; i++) {
        try {
          const videoProxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(links[i])}`;
          const videoRes = await axios.get(videoProxyUrl, { timeout: 15000 });
          const $vid = cheerio.load(videoRes.data.contents);
          
          const title = $vid('meta[property="og:title"]').attr('content') || $vid('title').text() || 'Capítulo disponible';
          let desc = $vid('meta[property="og:description"]').attr('content') || 'Sin resumen disponible.';
          
          if (desc.length > 200) desc = desc.substring(0, 200) + '...';

          respuestaFinal += `🎬 *Opción ${i + 1}:* ${title}\n`;
          respuestaFinal += `📝 *Sinopsis:* ${desc}\n\n`;
          respuestaFinal += `📥 *Copia y pega esto para descargar:*\n.descargar ${links[i]}\n`;
          respuestaFinal += `━━━━━━━━━━━━━━━━━━\n\n`;
        } catch (err) {
          console.log(`Fallo al leer la opción ${i + 1}`);
        }
      }

      return sock.sendMessage(remoteJid, { text: respuestaFinal.trim() }, { quoted: msg });

    } catch (e) {
      console.log('❌ Error en buscador blindado:', e.message);
      return sock.sendMessage(remoteJid, { text: '❌ Error al procesar la búsqueda. El proxy podría estar saturado.' }, { quoted: msg });
    }
  }
};
