'use strict';
const axios = require('axios');
const cheerio = require('cheerio');

// Memoria para guardar las listas de animes por cada grupo
const sesionesAnime = new Map();

module.exports = {
  // Añadimos el comando "opcion" para navegar por el menú
  commands: ['buscaranime', 'animes', 'opcion'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg, command } = ctx;

    // ==========================================
    // 🗂️ COMANDO: .opcion (Para entrar al detalle)
    // ==========================================
    if (command === 'opcion') {
      if (!sesionesAnime.has(remoteJid)) {
        return sock.sendMessage(remoteJid, { text: '❌ No hay ninguna búsqueda activa. Usa *.buscaranime* primero.' }, { quoted: msg });
      }

      const opcionIndex = parseInt(args[0]) - 1;
      const sesion = sesionesAnime.get(remoteJid);

      if (isNaN(opcionIndex) || opcionIndex < 0 || opcionIndex >= sesion.length) {
        return sock.sendMessage(remoteJid, { text: `❌ Opción inválida. Elige un número del 1 al ${sesion.length}.` }, { quoted: msg });
      }

      const animeSeleccionado = sesion[opcionIndex];
      
      await sock.sendMessage(remoteJid, { text: `🔍 *Analizando:* ${animeSeleccionado.title}...\nExtrayendo cantidad de capítulos.` }, { quoted: msg });

      try {
        // Entramos a la página específica de ese anime
        const { data } = await axios.get(`https://www3.animeflv.net${animeSeleccionado.link}`, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        // Buscamos cuántos capítulos tiene leyendo el código interno de AnimeFLV
        const match = data.match(/var episodes = (\[.*?\]);/);
        let totalCapitulos = '?';
        if (match && match[1]) {
          const episodios = JSON.parse(match[1]);
          totalCapitulos = episodios.length; // Cantidad total de capítulos
        }

        // Detectamos el idioma leyendo el título
        const esLatino = animeSeleccionado.title.toLowerCase().includes('latino');
        const idiomaTexto = esLatino ? '🇲🇽 Español Latino' : '🇯🇵 Japonés (Sub Español)';

        const detalleTexto = 
`📺 *INFO DEL ANIME* 📺

🎬 *Título:* ${animeSeleccionado.title}
🗣️ *Idioma:* ${idiomaTexto}
🔢 *Capítulos Disponibles:* ${totalCapitulos}

📥 *¿CÓMO DESCARGAR?*
Copia el texto de abajo, pégalo, cambia el "1" por el capítulo que quieras y envíalo:

*.anime ${animeSeleccionado.title} - 1*`;

        return sock.sendMessage(remoteJid, { text: detalleTexto }, { quoted: msg });

      } catch (error) {
        return sock.sendMessage(remoteJid, { text: '❌ Error al leer los detalles de este anime.' }, { quoted: msg });
      }
    }

    // ==========================================
    // 🔍 COMANDO: .buscaranime (Para listar)
    // ==========================================
    if (command === 'buscaranime' || command === 'animes') {
      if (!args.length) return sock.sendMessage(remoteJid, { text: '❌ Pon el nombre del anime.\nEjemplo: .buscaranime jujutsu' }, { quoted: msg });

      const query = args.join(' ');
      await sock.sendMessage(remoteJid, { text: `🔍 Buscando "${query}" en el catálogo...` }, { quoted: msg });

      try {
        const { data } = await axios.get(`https://www3.animeflv.net/browse?q=${encodeURIComponent(query)}`, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(data);
        const resultados = [];

        $('.ListAnimes li article.Anime').each((i, el) => {
          if (i < 10) { // Máximo 10 resultados
            const title = $(el).find('h3.Title').text().trim();
            const link = $(el).find('a').attr('href');
            if (title && link) resultados.push({ title, link });
          }
        });

        if (!resultados.length) return sock.sendMessage(remoteJid, { text: '❌ No se encontró nada con ese nombre.' }, { quoted: msg });

        // Guardamos los resultados en la memoria del grupo
        sesionesAnime.set(remoteJid, resultados);

        let respuesta = `🎌 *CATÁLOGO DE RESULTADOS* 🎌\n\n`;
        resultados.forEach((anime, i) => {
          // Le ponemos una marca visual si es Latino para que el usuario sepa rápido
          const marcaLatino = anime.title.toLowerCase().includes('latino') ? ' 🇲🇽(Latino)' : '';
          respuesta += `*${i + 1}.* ${anime.title}${marcaLatino}\n`;
        });
        
        respuesta += `\n💡 *Para ver capítulos y descargar:*
Escribe *.opcion [número]*

*Ejemplo:*
.opcion 1`;

        return sock.sendMessage(remoteJid, { text: respuesta }, { quoted: msg });

      } catch (error) {
        return sock.sendMessage(remoteJid, { text: '❌ Hubo un error al buscar en el catálogo.' }, { quoted: msg });
      }
    }
  }
};
