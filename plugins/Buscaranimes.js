'use strict';
const axios = require('axios');

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
      await sock.sendMessage(remoteJid, { text: `🔍 *Generando código de descarga para:* ${anime.title}...` }, { quoted: msg });

      // Convertimos el nombre a formato Slug de AnimeFLV (ej: "Naruto Shippuden" -> "naruto-shippuden")
      let slug = anime.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      const detalleTexto = 
`📺 *INFO DEL ANIME* 📺

🎬 *Título:* ${anime.title}
🔢 *Capítulos:* ${anime.episodes || 'Desconocido'}
⭐ *Puntuación:* ${anime.score || 'N/A'}

📥 *¿CÓMO DESCARGAR?*
Copia el código exacto de abajo y cambia el "1" por el número de capítulo:

*.anime ${slug} - 1*

_Nota: Si el código tiene un error, borra palabras extra como "tv" o "season"._`;

      return sock.sendMessage(remoteJid, { text: detalleTexto }, { quoted: msg });
    }

    // ==========================================
    // 🔍 COMANDO: .buscaranime
    // ==========================================
    if (command === 'buscaranime' || command === 'animes') {
      if (!args.length) return sock.sendMessage(remoteJid, { text: '❌ Pon el nombre.\nEjemplo: .buscaranime naruto' }, { quoted: msg });

      const query = args.join(' ');
      await sock.sendMessage(remoteJid, { text: `🔍 *Buscando:* "${query}" en la base de datos global...` }, { quoted: msg });

      try {
        // Usamos la API de Jikan (MyAnimeList) que no está bloqueada en Perú
        const { data } = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}`);
        
        if (!data || !data.data || data.data.length === 0) {
          return sock.sendMessage(remoteJid, { text: '❌ No se encontró ese anime.' }, { quoted: msg });
        }

        const resultados = data.data.slice(0, 10);
        sesionesAnime.set(remoteJid, resultados);

        let respuesta = `🎌 *CATÁLOGO GLOBAL* 🎌\n\n`;
        resultados.forEach((anime, i) => {
          respuesta += `*${i + 1}.* ${anime.title} (${anime.year || 'N/A'})\n`;
        });
        
        respuesta += `\n💡 *Para ver detalles y obtener código:*\nEscribe *.opcion [número]*\nEjemplo: .opcion 1`;

        return sock.sendMessage(remoteJid, { text: respuesta }, { quoted: msg });
      } catch (error) {
        return sock.sendMessage(remoteJid, { text: '❌ Error de conexión con la base de datos global.' }, { quoted: msg });
      }
    }
  }
};
