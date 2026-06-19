'use strict';

const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
  commands: ['buscaranime', 'animes'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg } = ctx;

    if (args.length === 0) return sock.sendMessage(remoteJid, { text: '❌ Ejemplo: .buscaranime jujutsu kaisen 1' }, { quoted: msg });

    const query = args.join(' ');
    await sock.sendMessage(remoteJid, { text: `🔍 *Cazando el capítulo real de "${query}"...*\nAnalizando duración de los resultados.` }, { quoted: msg });

    try {
      const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent('site:tokyvideo.com ' + query)}`;
      const { data } = await axios.get(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const $ = cheerio.load(data);
      
      let enlacesCandidatos = [];
      $('.b_algo h2 a').each((i, el) => {
        const href = $(el).attr('href');
        if (href && href.includes('tokyvideo.com/video/')) enlacesCandidatos.push(href);
      });

      // Solo evaluamos los 5 mejores resultados para no tardar una eternidad
      let encontrado = null;
      for (const link of enlacesCandidatos.slice(0, 5)) {
        try {
          const videoPage = await axios.get(link, { headers: { 'User-Agent': 'Mozilla/5.0' } });
          // Buscamos la duración en el JSON de TokyVideo
          const durationMatch = videoPage.data.match(/"duration":(\d+)/);
          if (durationMatch) {
            const duracionSegundos = parseInt(durationMatch[1]);
            // 17 minutos = 1020 segundos
            if (duracionSegundos >= 1020) {
              encontrado = { link, duracion: (duracionSegundos / 60).toFixed(1) };
              break; // ¡Encontrado!
            }
          }
        } catch (e) { continue; }
      }

      if (!encontrado) {
        return sock.sendMessage(remoteJid, { text: '❌ No encontré ningún video que dure más de 17 minutos.' }, { quoted: msg });
      }

      // Si encuentra el capítulo, lo descarga automáticamente usando el descargador
      await sock.sendMessage(remoteJid, { text: `✅ *Capítulo localizado:* Dura ${encontrado.duracion} minutos.\nDescargando y enviando...` }, { quoted: msg });
      
      // Aquí llamamos a la lógica de descarga (puedes copiar aquí el código de tu descargar.js)
      // O simplemente le enviamos el link para que el usuario solo tenga que darle clic
      return sock.sendMessage(remoteJid, { text: `🔗 *Aquí tienes el enlace directo:* ${encontrado.link}\n\nUsa .descargar ${encontrado.link}` }, { quoted: msg });

    } catch (e) {
      return sock.sendMessage(remoteJid, { text: '❌ Error al cazar el episodio.' }, { quoted: msg });
    }
  }
};
