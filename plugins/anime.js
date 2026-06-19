'use strict';
const axios = require('axios');

module.exports = {
  commands: ['anime', 'descargar'],
  async execute(ctx) {
    const { sock, remoteJid, args, msg, sender } = ctx;
    const input = args.join(' ');
    
    if (!input.includes('-')) return sock.sendMessage(remoteJid, { text: '❌ Formato: .anime Nombre - Capitulo' }, { quoted: msg });

    const [nombre, capitulo] = input.split('-').map(s => s.trim());
    
    await sock.sendMessage(remoteJid, { text: `🔍 Buscando: ${nombre} episodio ${capitulo}...` }, { quoted: msg });

    try {
      // Usamos una API más estable (consumet/animeflv)
      const res = await axios.get(`https://api.consumet.org/anime/animeflv/${encodeURIComponent(nombre)}`);
      if (!res.data.results.length) return sock.sendMessage(remoteJid, { text: '❌ Anime no encontrado.' }, { quoted: msg });

      // Buscamos el mejor match (si pediste latino, buscamos el que tenga 'latino' en el título)
      let anime = res.data.results.find(a => nombre.toLowerCase().includes('latino') && a.title.toLowerCase().includes('latino')) || res.data.results[0];

      // Obtenemos los episodios
      const info = await axios.get(`https://api.consumet.org/anime/animeflv/info?id=${anime.id}`);
      const ep = info.data.episodes.find(e => e.number == capitulo);
      
      if (!ep) return sock.sendMessage(remoteJid, { text: '❌ Ese capítulo no existe.' }, { quoted: msg });

      // Obtenemos el link de descarga
      const watch = await axios.get(`https://api.consumet.org/anime/animeflv/watch?episodeId=${ep.id}`);
      const video = watch.data.sources.find(s => s.quality === '720p')?.url || watch.data.sources[0].url;

      await sock.sendMessage(remoteJid, {
        document: { url: video },
        mimetype: 'video/mp4',
        fileName: `${anime.title} Ep ${capitulo}.mp4`,
        caption: `✅ *Descarga lista:* ${anime.title} - Ep ${capitulo}`
      }, { quoted: msg });

    } catch (e) {
      await sock.sendMessage(remoteJid, { text: '❌ Error: El servidor de anime está ocupado. Intenta en un momento.' }, { quoted: msg });
    }
  }
};
