'use strict';
const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
  commands: ['buscar', 'buscaranime'],
  async execute(ctx) {
    const { sock, remoteJid, args, msg } = ctx;
    if (!args.length) return sock.sendMessage(remoteJid, { text: '❌ Pon el nombre del anime.' }, { quoted: msg });

    const query = args.join(' ');
    const { data } = await axios.get(`https://www3.animeflv.net/browse?q=${encodeURIComponent(query)}`);
    const $ = cheerio.load(data);
    const resultados = [];

    $('.ListAnimes li article.Anime').each((i, el) => {
      if (i < 8) {
        const title = $(el).find('h3.Title').text().trim();
        resultados.push(title);
      }
    });

    if (!resultados.length) return sock.sendMessage(remoteJid, { text: '❌ No encontré nada.' }, { quoted: msg });

    let respuesta = `🎌 *RESULTADOS ENCONTRADOS* 🎌\n\n`;
    resultados.forEach((t, i) => {
      respuesta += `*${i + 1}.* ${t}\n`;
    });
    
    respuesta += `\n💡 *COPIA Y PEGA PARA DESCARGAR:*\n\n`;
    respuesta += `Para ver en Español Latino:\n_.anime ${resultados[0]} (Latino) - 1_\n\n`;
    respuesta += `Para ver en Subtitulado:\n_.anime ${resultados[0]} - 1_`;

    return sock.sendMessage(remoteJid, { text: respuesta }, { quoted: msg });
  }
};
