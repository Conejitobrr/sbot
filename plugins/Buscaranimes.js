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

    await sock.sendMessage(remoteJid, { text: `🔍 *Filtrando resultados...*\nBuscando episodios completos de "${nombreAnime}" (ignorando música y fragmentos).` }, { quoted: msg });

    try {
      // 🛡️ Filtro Avanzado: Excluimos palabras clave para evitar basura
      const query = `site:tokyvideo.com "${nombreAnime}" ${capitulo} -radio -op -ending -trailer`;
      const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;

      const { data } = await axios.get(searchUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });

      const $ = cheerio.load(data);
      let resultados = [];

      $('.b_algo').each((i, el) => {
        const title = $(el).find('h2').text().trim();
        const href = $(el).find('h2 a').attr('href');
        
        // 🧪 Filtro de calidad: Solo tomamos lo que parece un episodio
        if (href && href.includes('tokyvideo.com/video/')) {
          const lowerTitle = title.toLowerCase();
          // Ignoramos si dice "radio", "op", "ed" o si es muy corto
          if (!lowerTitle.includes('radio') && !lowerTitle.includes('op') && !lowerTitle.includes('trailer')) {
            resultados.push({ title, href });
          }
        }
      });

      // Recortamos a los 3 mejores resultados únicos
      resultados = Array.from(new Set(resultados.map(r => r.href))).map(href => resultados.find(r => r.href === href)).slice(0, 3);

      if (!resultados.length) {
        return sock.sendMessage(remoteJid, { text: '❌ No encontré episodios completos. Intenta buscar un nombre más específico.' }, { quoted: msg });
      }

      let respuestaFinal = `🎌 *EPISODIOS ENCONTRADOS (Filtrados)* 🎌\n\n`;
      resultados.forEach((res, i) => {
        respuestaFinal += `🎬 *Opción ${i + 1}:* ${res.title}\n`;
        respuestaFinal += `📥 *Copia esto para descargar:*\n.descargar ${res.href}\n`;
        respuestaFinal += `━━━━━━━━━━━━━━━━━━\n\n`;
      });

      return sock.sendMessage(remoteJid, { text: respuestaFinal.trim() }, { quoted: msg });

    } catch (e) {
      return sock.sendMessage(remoteJid, { text: '❌ Error al filtrar resultados.' }, { quoted: msg });
    }
  }
};
