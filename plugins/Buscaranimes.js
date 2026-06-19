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

    await sock.sendMessage(remoteJid, { text: `🔍 *Rastreador en Modo Sigilo...*\nUsando motores de búsqueda para encontrar "${nombreAnime}" Ep ${capitulo} sin ser detectados.` }, { quoted: msg });

    try {
      // Forzamos a DuckDuckGo a buscar solo dentro de TokyVideo
      const query = `site:tokyvideo.com "${nombreAnime}" "capitulo ${capitulo}" (latino OR sub)`;
      const urlBusqueda = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

      const { data } = await axios.get(urlBusqueda, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });

      const $ = cheerio.load(data);
      let links = [];

      // Extraemos los links reales de los resultados
      $('.result__snippet').each((i, el) => {
        if (i < 2) { // Tomamos las 2 mejores opciones
          const href = $(el).parent().find('.result__url').attr('href');
          if (href && href.includes('uddg=')) {
            const urlParams = new URLSearchParams(href.split('?')[1]);
            const cleanLink = decodeURIComponent(urlParams.get('uddg'));
            if (cleanLink.includes('tokyvideo.com/video/')) links.push(cleanLink);
          }
        }
      });

      if (!links.length) {
        return sock.sendMessage(remoteJid, { text: '❌ No se encontraron resultados.\n\n💡 *Tip:* Asegúrate de escribir el nombre bien. (Ej: .buscaranime naruto - 5)' }, { quoted: msg });
      }

      let respuestaFinal = `🎌 *RESULTADOS ENCONTRADOS* 🎌\n\n`;

      links.forEach((link, i) => {
        // Limpiamos la URL para crear un título improvisado
        const tituloLimpio = link.split('/video/')[1].replace(/-/g, ' ').toUpperCase();
        respuestaFinal += `🎬 *Opción ${i + 1}:* ${tituloLimpio}\n`;
        respuestaFinal += `📥 *Copia y pega esto para descargar:*\n.descargar ${link}\n`;
        respuestaFinal += `━━━━━━━━━━━━━━━━━━\n\n`;
      });

      return sock.sendMessage(remoteJid, { text: respuestaFinal.trim() }, { quoted: msg });

    } catch (e) {
      console.log('Error en buscador DDG:', e.message);
      return sock.sendMessage(remoteJid, { text: '❌ Error al buscar en los motores de internet.' }, { quoted: msg });
    }
  }
};
