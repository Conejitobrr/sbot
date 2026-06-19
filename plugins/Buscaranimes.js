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

    await sock.sendMessage(remoteJid, { text: `🔍 *Búsqueda Inteligente...*\nRastreando TokyVideo para: ${nombreAnime} (Cap/Ep ${capitulo})` }, { quoted: msg });

    try {
      // Búsqueda relajada (sin comillas) para que encuentre "ep1", "Cap 1", "episodio 1", etc.
      const query = `site:tokyvideo.com ${nombreAnime} ${capitulo} latino OR sub`;
      const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;

      const { data } = await axios.get(searchUrl, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'es-ES,es;q=0.9'
        }
      });

      const $ = cheerio.load(data);
      let resultados = [];

      // Extraemos el título real y el enlace, tal como se ve en tu captura de Google
      $('.b_algo').each((i, el) => {
        const title = $(el).find('h2').text().trim();
        const href = $(el).find('h2 a').attr('href');
        
        if (href && href.includes('tokyvideo.com/video/') && resultados.length < 3) {
          // Filtramos un poco para que no traiga basura
          if (title.toLowerCase().includes(nombreAnime.toLowerCase().split(' ')[0])) {
            resultados.push({ title, href });
          }
        }
      });

      if (!resultados.length) {
        return sock.sendMessage(remoteJid, { text: '❌ No encontré coincidencias.\n\n💡 *Tip:* Intenta buscar solo una palabra clave. (Ej: .buscaranime jujutsu - 1)' }, { quoted: msg });
      }

      let respuestaFinal = `🎌 *RESULTADOS EN TOKYVIDEO* 🎌\n\n`;

      resultados.forEach((res, i) => {
        respuestaFinal += `🎬 *Opción ${i + 1}:* ${res.title}\n`;
        respuestaFinal += `📥 *Copia para descargar:*\n.descargar ${res.href}\n`;
        respuestaFinal += `━━━━━━━━━━━━━━━━━━\n\n`;
      });

      return sock.sendMessage(remoteJid, { text: respuestaFinal.trim() }, { quoted: msg });

    } catch (e) {
      console.log('❌ Error en buscador Bing:', e.message);
      return sock.sendMessage(remoteJid, { text: '❌ Ocurrió un error al conectar con el motor de búsqueda.' }, { quoted: msg });
    }
  }
};
