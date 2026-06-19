'use strict';

const axios = require('axios');

const cooldowns = new Map();
const COOLDOWN_TIME = 10 * 60 * 1000;

module.exports = {
  commands: ['anime', 'descargaranime'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg, sender } = ctx;

    // Cooldown
    if (cooldowns.has(sender)) {
      const timeLeft = COOLDOWN_TIME - (Date.now() - cooldowns.get(sender));
      if (timeLeft > 0) return sock.sendMessage(remoteJid, { text: `⏳ Espera ${Math.ceil(timeLeft / 60000)} min.` }, { quoted: msg });
    }

    const input = args.join(' ');
    if (!input.includes('-')) {
      return sock.sendMessage(remoteJid, { text: '❌ Formato: .anime Nombre de Anime - Numero de capitulo' }, { quoted: msg });
    }

    const [nombre, capitulo] = input.split('-').map(s => s.trim());
    
    await sock.sendMessage(remoteJid, { text: `🔍 Buscando y preparando: ${nombre} episodio ${capitulo}...` }, { quoted: msg });

    try {
      // 1. Buscamos el ID correcto en la API
      const searchRes = await axios.get(`https://api.consumet.org/anime/animeflv/${encodeURIComponent(nombre)}`);
      if (!searchRes.data.results.length) return sock.sendMessage(remoteJid, { text: '❌ No encontré ese anime.' }, { quoted: msg });

      const animeId = searchRes.data.results[0].id;
      const tituloOficial = searchRes.data.results[0].title;

      // 2. Obtenemos el link del episodio
      const watchRes = await axios.get(`https://api.consumet.org/anime/animeflv/watch/${animeId}-${capitulo}`);
      
      if (!watchRes.data.sources || watchRes.data.sources.length === 0) {
        return sock.sendMessage(remoteJid, { text: '❌ Capítulo no encontrado o no disponible.' }, { quoted: msg });
      }

      const videoUrl = watchRes.data.sources.find(s => s.quality === '720p')?.file || watchRes.data.sources[0].file;

      cooldowns.set(sender, Date.now());

      await sock.sendMessage(remoteJid, {
        document: { url: videoUrl },
        mimetype: 'video/mp4',
        fileName: `${tituloOficial} Ep ${capitulo}.mp4`,
        caption: `✅ *Descarga lista:* ${tituloOficial} - Ep ${capitulo}`
      }, { quoted: msg });

    } catch (err) {
      sock.sendMessage(remoteJid, { text: '❌ Error: Intenta con otro anime o revisa si el capítulo existe.' }, { quoted: msg });
    }
  }
};
