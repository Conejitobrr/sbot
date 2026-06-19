'use strict';
const axios = require('axios');
const cheerio = require('cheerio');

const sesionesAnime = new Map();

module.exports = {
  commands: ['buscaranime', 'animes', 'opcion'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg, command } = ctx;

    // ==========================================
    // 🗂️ COMANDO: .opcion
    // ==========================================
    if (command === 'opcion') {
      if (!sesionesAnime.has(remoteJid)) return sock.sendMessage(remoteJid, { text: '❌ Usa *.buscaranime* primero.' }, { quoted: msg });

      const opcionIndex = parseInt(args[0]) - 1;
      const sesion = sesionesAnime.get(remoteJid);

      if (isNaN(opcionIndex) || opcionIndex < 0 || opcionIndex >= sesion.length) {
        return sock.sendMessage(remoteJid, { text: `❌ Elige un número del 1 al ${sesion.length}.` }, { quoted: msg });
      }

      const anime = sesion[opcionIndex];
      await sock.sendMessage(remoteJid, { text: `🔍 *Analizando:* ${anime.title}...` }, { quoted: msg });

      try {
        const { data } = await axios.get(`https://www3.animeflv.net${anime.link}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        
        const match = data.match(/var episodes = (\[.*?\]);/);
        let totalCapitulos = '?';
        if (match && match[1]) totalCapitulos = JSON.parse(match[1]).length;

        const esLatino = anime.title.toLowerCase().includes('latino');
        const idiomaTexto = esLatino ? '🇲🇽 Español Latino' : '🇯🇵 Japonés (Sub Español)';

        const detalleTexto = 
`📺 *INFO DEL ANIME* 📺

🎬 *Título:* ${anime.title}
🗣️ *Idioma:* ${idiomaTexto}
🔢 *Capítulos Disponibles:* ${totalCapitulos}

📥 *¿CÓMO DESCARGAR?*
Copia el código exacto de abajo y cambia el "1" por el capítulo que quieras:

*.anime ${anime.slug} - 1*`;

        return sock.sendMessage(remoteJid, { text: detalleTexto }, { quoted: msg });
      } catch (error) {
        return sock.sendMessage(remoteJid, { text: '❌ Error al leer los detalles.' }, { quoted: msg });
      }
    }

    // ==========================================
    // 🔍 COMANDO: .buscaranime
    // ==========================================
    if (command === 'buscaranime' || command === 'animes') {
      if (!args.length) return sock.sendMessage(remoteJid, { text: '❌ Pon el nombre.\nEjemplo: .buscaranime naruto' }, { quoted: msg });

      const query = args.join(' ');
      await sock.sendMessage(remoteJid, { text: `🔍 Buscando "${query}" directamente en AnimeFLV...` }, { quoted: msg });

      try {
        const { data } = await axios.get(`https://www3.animeflv.net/browse?q=${encodeURIComponent(query)}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(data);
        const resultados = [];

        $('.ListAnimes li article.Anime').each((i, el) => {
          if (i < 10) {
            const title = $(el).find('h3.Title').text().trim();
            const link = $(el).find('a').attr('href'); 
            if (title && link) {
              // Extraemos el código oculto (Slug) que usa AnimeFLV para sus links
              const slug = link.split('/anime/')[1];
              resultados.push({ title, link, slug });
            }
          }
        });

        if (!resultados.length) return sock.sendMessage(remoteJid, { text: '❌ AnimeFLV no tiene ese anime registrado.' }, { quoted: msg });

        sesionesAnime.set(remoteJid, resultados);

        let respuesta = `🎌 *RESULTADOS EXACTOS* 🎌\n\n`;
        resultados.forEach((anime, i) => {
          const marcaLatino = anime.title.toLowerCase().includes('latino') ? ' 🇲🇽(Latino)' : '';
          respuesta += `*${i + 1}.* ${anime.title}${marcaLatino}\n`;
        });
        
        respuesta += `\n💡 *Para ver capítulos y descargar:*\nEscribe *.opcion [número]*\nEjemplo: .opcion 1`;

        return sock.sendMessage(remoteJid, { text: respuesta }, { quoted: msg });
      } catch (error) {
        return sock.sendMessage(remoteJid, { text: '❌ Error al conectar con AnimeFLV.' }, { quoted: msg });
      }
    }
  }
};
