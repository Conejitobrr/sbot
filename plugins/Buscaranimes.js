'use strict';

const axios = require('axios');

module.exports = {
  commands: ['buscaranime', 'animes'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg, sender } = ctx;

    try {
      if (!args.length) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Dime el nombre de un anime para buscar sus temporadas.\n\nEjemplo:\n.buscaranime tokyo ghoul'
        }, { quoted: msg });
      }

      const query = args.join(' ');

      await sock.sendMessage(remoteJid, {
        text: `🔍 *Buscando en la biblioteca otaku:* ${query}...`
      }, { quoted: msg });

      // Buscamos en la misma API de AnimeFLV que usa nuestro descargador
      const url = `https://api.consumet.org/anime/animeflv/${encodeURIComponent(query)}`;
      const { data } = await axios.get(url).catch(() => null);

      if (!data || !data.results || data.results.length === 0) {
        return sock.sendMessage(remoteJid, {
          text: `❌ No encontré nada parecido a "*${query}*".\n\nIntenta buscarlo por su nombre en japonés (Romaji).`
        }, { quoted: msg });
      }

      // Tomamos solo los primeros 10 resultados para no saturar la pantalla del celular
      const resultados = data.results.slice(0, 10);
      
      let texto = `🎌 *CATÁLOGO ENCONTRADO* 🎌\n\nCopia el título exacto de la temporada que quieras y úsalo en el comando de descarga:\n\n`;

      resultados.forEach((anime, index) => {
        texto += `*${index + 1}.* ${anime.title}\n`;
      });

      texto += `\n💡 *¿Cómo lo descargo ahora?*\nEscribe *.anime*, luego pega el título exacto, pon un guion (*-*) y el número de capítulo.\n\n*Ejemplo real:*\n.anime ${resultados[0].title} - 1`;

      return sock.sendMessage(remoteJid, {
        text: texto
      }, { quoted: msg });

    } catch (error) {
      console.log('❌ Error en buscaranime.js:', error?.message || error);
      
      return sock.sendMessage(remoteJid, {
        text: '❌ Hubo un problema al conectar con la base de datos de anime. El servidor podría estar caído temporalmente.'
      }, { quoted: msg });
    }
  }
};
