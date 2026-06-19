'use strict';

const axios = require('axios');

// Sistema de Cooldown para proteger el servidor (10 minutos)
const cooldowns = new Map();
const COOLDOWN_TIME = 10 * 60 * 1000;

module.exports = {
  commands: ['anime', 'descargaranime'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg, sender } = ctx;

    // ==========================================
    // ⏳ VERIFICACIÓN DE COOLDOWN
    // ==========================================
    if (cooldowns.has(sender)) {
      const lastTime = cooldowns.get(sender);
      const timeLeft = COOLDOWN_TIME - (Date.now() - lastTime);
      
      if (timeLeft > 0) {
        const minutos = Math.ceil(timeLeft / 60000);
        return sock.sendMessage(remoteJid, { 
          text: `⏳ *SISTEMA SOBRECARGADO*\n\nDebes esperar *${minutos} minutos* antes de descargar otro anime. ¡No quemes mi servidor!` 
        }, { quoted: msg });
      }
    }

    try {
      // ==========================================
      // 🛠️ PROCESAMIENTO DEL COMANDO
      // ==========================================
      const input = args.join(' ');
      
      // El formato debe ser: .anime Nombre y Temporada - Capitulo
      if (!input.includes('-')) {
        return sock.sendMessage(remoteJid, {
          text: `❌ *Formato incorrecto.*\n\nDebes separar el nombre/temporada y el capítulo con un guion (*-*).\n\n💡 *Ejemplo:*\n.anime Demon Slayer Temporada 2 - 5\n.anime Naruto Shippuden - 120`
        }, { quoted: msg });
      }

      const partes = input.split('-');
      const animeName = partes[0].trim();
      const episodeNum = partes[1].trim();

      await sock.sendMessage(remoteJid, {
        text: `🔍 *Buscando en la base de datos...*\n🎬 *Anime:* ${animeName}\n🔢 *Capítulo:* ${episodeNum}\n\n_Esto puede tardar un par de minutos dependiendo del peso del archivo. Paciencia._`
      }, { quoted: msg });

      // Aplicamos el castigo del cooldown AHORA, para que no pidan otro mientras este descarga
      cooldowns.set(sender, Date.now());

      // ==========================================
      // 📡 CONEXIÓN CON LA API DE ANIMEFLV
      // ==========================================
      // 1. Buscamos el ID exacto del anime
      const searchUrl = `https://api.consumet.org/anime/animeflv/${encodeURIComponent(animeName)}`;
      const searchRes = await axios.get(searchUrl).catch(() => null);

      if (!searchRes || !searchRes.data.results || searchRes.data.results.length === 0) {
        cooldowns.delete(sender); // Le quitamos el castigo porque falló
        return sock.sendMessage(remoteJid, { 
          text: `❌ No pude encontrar ningún anime llamado *${animeName}*.\nIntenta escribir el nombre exacto (o en japonés/romaji).` 
        }, { quoted: msg });
      }

      const animeId = searchRes.data.results[0].id;
      const tituloOficial = searchRes.data.results[0].title;

      // 2. Construimos el ID del episodio (AnimeFLV usa el formato "id-episodio")
      const episodeId = `${animeId}-${episodeNum}`;

      // 3. Extraemos los links de video directos (.mp4)
      const watchUrl = `https://api.consumet.org/anime/animeflv/watch/${episodeId}`;
      const watchRes = await axios.get(watchUrl).catch(() => null);

      if (!watchRes || !watchRes.data.sources || watchRes.data.sources.length === 0) {
        cooldowns.delete(sender);
        return sock.sendMessage(remoteJid, { 
          text: `❌ El anime existe, pero el *Capítulo ${episodeNum}* no está disponible o aún no se ha estrenado.` 
        }, { quoted: msg });
      }

      // Buscamos la mejor calidad disponible (o el formato mp4 por defecto)
      let videoData = watchRes.data.sources.find(s => s.quality === '1080p') || 
                      watchRes.data.sources.find(s => s.quality === '720p') || 
                      watchRes.data.sources.find(s => s.quality === 'default') || 
                      watchRes.data.sources[0];

      const videoUrl = videoData.file;

      // ==========================================
      // 📥 ENVÍO DEL ARCHIVO PESADO (DOCUMENTO)
      // ==========================================
      await sock.sendMessage(remoteJid, {
        document: { url: videoUrl }, // Baileys descarga y reenvía el archivo automáticamente
        mimetype: 'video/mp4',
        fileName: `${tituloOficial} - Ep ${episodeNum}.mp4`,
        caption: `📺 *ANIME DESCARGADO*\n\n🎬 *Título:* ${tituloOficial}\n🔢 *Episodio:* ${episodeNum}\n👤 *Pedido por:* @${sender.split('@')[0]}\n\n_SiriusBot | Calidad: ${videoData.quality}_`,
        mentions: [sender]
      }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error en anime.js:', err?.message || err);
      cooldowns.delete(sender); // Liberamos al usuario si la descarga se rompió a la mitad

      await sock.sendMessage(remoteJid, {
        text: '❌ Hubo un error crítico al intentar descargar el video. Es posible que el servidor de AnimeFLV esté saturado. Inténtalo más tarde.'
      }, { quoted: msg });
    }
  }
};
