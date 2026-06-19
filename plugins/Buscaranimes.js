'use strict';

const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
  commands: ['buscaranime', 'animes'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg } = ctx;

    try {
      if (!args.length) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Dime el nombre de un anime para buscar sus temporadas.\n\nEjemplo:\n.buscaranime tokyo ghoul'
        }, { quoted: msg });
      }

      const query = args.join(' ');

      await sock.sendMessage(remoteJid, {
        text: `🔍 *Infiltrándose en AnimeFLV:* Buscando ${query}...`
      }, { quoted: msg });

      // Hacemos la petición DIRECTA a la página oficial, sin depender de APIs de terceros
      const url = `https://www3.animeflv.net/browse?q=${encodeURIComponent(query)}`;
      const { data } = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      const $ = cheerio.load(data);
      const resultados = [];

      // Raspamos el código de la página para sacar los títulos exactos
      $('.ListAnimes li article.Anime').each((i, el) => {
        if (i < 10) { // Solo tomamos los primeros 10 resultados
          const title = $(el).find('h3.Title').text().trim();
          if (title) {
            resultados.push(title);
          }
        }
      });

      if (resultados.length === 0) {
        return sock.sendMessage(remoteJid, {
          text: `❌ AnimeFLV no tiene nada registrado como "*${query}*".\n\nIntenta buscarlo por su nombre en japonés (Romaji).`
        }, { quoted: msg });
      }

      let texto = `🎌 *CATÁLOGO DE ANIMEFLV* 🎌\n\nCopia el título exacto de la temporada que quieras y úsalo en el comando de descarga:\n\n`;

      resultados.forEach((title, index) => {
        texto += `*${index + 1}.* ${title}\n`;
      });

      texto += `\n💡 *¿Cómo lo descargo ahora?*\nEscribe *.anime*, pega el título exacto, pon un guion (*-*) y el número de capítulo.\n\n*Ejemplo:*\n.anime ${resultados[0]} - 1`;

      return sock.sendMessage(remoteJid, {
        text: texto
      }, { quoted: msg });

    } catch (error) {
      console.log('❌ Error en buscaranime.js:', error?.message || error);
      
      return sock.sendMessage(remoteJid, {
        text: '❌ Hubo un problema al leer la página de AnimeFLV. Inténtalo de nuevo.'
      }, { quoted: msg });
    }
  }
};
