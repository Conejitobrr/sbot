'use strict';
const axios = require('axios');

const cooldowns = new Map();
const COOLDOWN_TIME = 5 * 60 * 1000; // Lo bajé a 5 minutos para que sea más dinámico

module.exports = {
  commands: ['anime', 'descargar'],
  async execute(ctx) {
    const { sock, remoteJid, args, msg, sender } = ctx;
    
    if (cooldowns.has(sender)) {
      const timeLeft = COOLDOWN_TIME - (Date.now() - cooldowns.get(sender));
      if (timeLeft > 0) return sock.sendMessage(remoteJid, { text: `⏳ *ENFRIAMIENTO*\nEspera ${Math.ceil(timeLeft / 60000)} minutos para descargar otro.` }, { quoted: msg });
    }

    const input = args.join(' ');
    if (!input.includes('-')) return sock.sendMessage(remoteJid, { text: '❌ Te faltó el guion.\nEjemplo: .anime Naruto - 1' }, { quoted: msg });

    const [nombre, capitulo] = input.split('-').map(s => s.trim());
    
    await sock.sendMessage(remoteJid, { text: `⏳ *Procesando descarga...*\n🎬 Anime: ${nombre}\n🔢 Capítulo: ${capitulo}` }, { quoted: msg });

    try {
      // 1. Buscamos el ID exacto
      const res = await axios.get(`https://api.consumet.org/anime/animeflv/${encodeURIComponent(nombre)}`);
      if (!res.data.results || !res.data.results.length) return sock.sendMessage(remoteJid, { text: '❌ No pude encontrar los datos de descarga en el servidor.' }, { quoted: msg });

      // Agarramos el primer resultado porque el buscador ya nos dio el nombre exacto
      const anime = res.data.results[0];

      // 2. Traemos los links de video
      const watch = await axios.get(`https://api.consumet.org/anime/animeflv/watch/${anime.id}-${capitulo}`);
      if (!watch.data.sources || watch.data.sources.length === 0) {
        return sock.sendMessage(remoteJid, { text: `❌ El capítulo ${capitulo} aún no está disponible para descargar.` }, { quoted: msg });
      }

      // Buscamos calidad 720p para que no pase el límite de WhatsApp
      const video = watch.data.sources.find(s => s.quality === '720p')?.file || watch.data.sources[0].file;

      cooldowns.set(sender, Date.now());

      await sock.sendMessage(remoteJid, {
        document: { url: video },
        mimetype: 'video/mp4',
        fileName: `${nombre} Ep ${capitulo}.mp4`,
        caption: `✅ *ENTREGA DE ANIME*\n\n🎬 *Título:* ${nombre}\n🔢 *Capítulo:* ${capitulo}\n👤 *Pedido por:* @${sender.split('@')[0]}`,
        mentions: [sender]
      }, { quoted: msg });

    } catch (e) {
      console.log('Error de descarga API:', e.message);
      await sock.sendMessage(remoteJid, { text: '❌ Los servidores de video están saturados. Inténtalo de nuevo en unos minutos.' }, { quoted: msg });
    }
  }
};
