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

      const detalleTexto = 
`📺 *INFO DEL ANIME (TioAnime)* 📺

🎬 *Título:* ${anime.title}

📥 *¿CÓMO DESCARGAR?*
Copia el código exacto de abajo y cambia el "1" por el número de capítulo que deseas ver:

*.anime ${anime.slug} - 1*`;

      return sock.sendMessage(remoteJid, { text: detalleTexto }, { quoted: msg });
    }

    // ==========================================
    // 🔍 COMANDO: .buscaranime
    // ==========================================
    if (command === 'buscaranime' || command === 'animes') {
      if (!args.length) return sock.sendMessage(remoteJid, { text: '❌ Pon el nombre.\nEjemplo: .buscaranime naruto' }, { quoted: msg });

      const query = args.join(' ');
      await sock.sendMessage(remoteJid, { text: `🔍 Buscando "${query}" en los servidores de TioAnime...` }, { quoted: msg });

      try {
        const { data } = await axios.get(`https://tioanime.com/directorio?q=${encodeURIComponent(query)}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        
        const $ = cheerio.load(data);
        const resultados = [];

        // Raspamos el catálogo de TioAnime
        $('.animes .anime').each((i, el) => {
          if (i < 10) {
            const title = $(el).find('h3.title').text().trim();
            const link = $(el).find('a').attr('href'); 
            if (title && link) {
              const slug = link.split('/anime/')[1];
              resultados.push({ title, link, slug });
            }
          }
        });

        if (!resultados.length) return sock.sendMessage(remoteJid, { text: '❌ TioAnime no tiene ese anime registrado o lo escribiste mal.' }, { quoted: msg });

        sesionesAnime.set(remoteJid, resultados);

        let respuesta = `🎌 *CATÁLOGO TIOANIME* 🎌\n\n`;
        resultados.forEach((anime, i) => {
          respuesta += `*${i + 1}.* ${anime.title}\n`;
        });
        
        respuesta += `\n💡 *Para obtener el código de descarga:*\nEscribe *.opcion [número]*\nEjemplo: .opcion 1`;

        return sock.sendMessage(remoteJid, { text: respuesta }, { quoted: msg });
      } catch (error) {
        console.log(error.message);
        return sock.sendMessage(remoteJid, { text: '❌ Error al conectar con TioAnime.' }, { quoted: msg });
      }
    }
  }
};
