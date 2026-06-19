'use strict';

const axios = require('axios');
const cheerio = require('cheerio');

const cooldowns = new Map();
const COOLDOWN_TIME = 1 * 60 * 1000; 

module.exports = {
  commands: ['anime', 'descargar'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg, sender } = ctx;

    if (cooldowns.has(sender)) return sock.sendMessage(remoteJid, { text: '⏳ Espera 1 minuto antes de buscar otro enlace.' }, { quoted: msg });

    const input = args.join(' ');
    if (!input.includes('-')) return sock.sendMessage(remoteJid, { text: '❌ Formato: .anime jujutsu kaisen - 1' }, { quoted: msg });

    // Limpiamos el nombre (ej: "jujutsu-kaisen-tv" pasa a ser "jujutsu kaisen tv")
    const partes = input.split('-');
    const capitulo = partes.pop().trim();
    const nombreAnime = partes.join(' ').trim();

    await sock.sendMessage(remoteJid, { text: `🔍 *Rastreador Anti-Bloqueos activado...*\nBuscando enlaces de Google Drive para "${nombreAnime}" - Ep ${capitulo}` }, { quoted: msg });

    try {
      // Buscamos directamente en DuckDuckGo (que no bloquea scrapers) apuntando a Drive
      const query = `site:drive.google.com "${nombreAnime}" "capitulo ${capitulo}" latino OR sub`;
      const urlBusqueda = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

      const { data } = await axios.get(urlBusqueda, { 
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } 
      });

      const $ = cheerio.load(data);
      let linksDrive = '';

      // Extraemos los links reales de los resultados
      $('.result__snippet').each((i, el) => {
        if (i < 2) { // Tomamos las 2 mejores opciones
          const href = $(el).parent().find('.result__url').attr('href');
          if (href && href.includes('uddg=')) {
            const urlParams = new URLSearchParams(href.split('?')[1]);
            const cleanLink = urlParams.get('uddg');
            if (cleanLink) linksDrive += `*Drive:* ${decodeURIComponent(cleanLink)}\n\n`;
          }
        }
      });

      cooldowns.set(sender, Date.now());

      if (!linksDrive) {
        return sock.sendMessage(remoteJid, { text: `❌ No encontré carpetas públicas para este capítulo exacto en Drive.\n\n💡 *Intenta buscar un nombre más corto.* (Ejemplo: .anime jujutsu kaisen - 1)` }, { quoted: msg });
      }

      const respuestaFinal = 
`✅ *ENLACES DIRECTOS (Libres en Perú)* ✅

🎬 *Anime:* ${nombreAnime}
🔢 *Capítulo:* ${capitulo}

Estos enlaces no sufren bloqueos. Ábrelos para ver el video en calidad original o guardarlo en tu celular sin publicidad:

${linksDrive}`;

      return sock.sendMessage(remoteJid, { text: respuestaFinal }, { quoted: msg });

    } catch (e) {
      console.log('❌ Error en rastreo:', e.message);
      return sock.sendMessage(remoteJid, { text: '❌ Ocurrió un error al rastrear la web.' }, { quoted: msg });
    }
  }
};
