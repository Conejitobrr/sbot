'use strict';

const axios = require('axios');

const cooldowns = new Map();
const COOLDOWN_TIME = 5 * 60 * 1000; 

module.exports = {
  commands: ['anime', 'descargar'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg, sender } = ctx;
    
    if (cooldowns.has(sender)) {
      const timeLeft = COOLDOWN_TIME - (Date.now() - cooldowns.get(sender));
      if (timeLeft > 0) return sock.sendMessage(remoteJid, { text: `⏳ Espera ${Math.ceil(timeLeft / 60000)} minutos.` }, { quoted: msg });
    }

    const input = args.join(' ');
    if (!input.includes('-')) return sock.sendMessage(remoteJid, { text: '❌ Formato: .anime Nombre - Capitulo' }, { quoted: msg });

    const [nombre, capitulo] = input.split('-').map(s => s.trim());
    
    await sock.sendMessage(remoteJid, { text: `💻 *Hackeando servidores de AnimeFLV...*\nBuscando el archivo MP4 puro de ${nombre} - Ep ${capitulo}.` }, { quoted: msg });

    try {
      // 1. Convertimos el nombre normal a formato de URL de AnimeFLV (Slug)
      // Ej: "Jujutsu Kaisen (Latino)" -> "jujutsu-kaisen-latino"
      const slug = nombre.toLowerCase().replace(/\s*\(latino\)\s*/g, '-latino').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const episodeUrl = `https://www3.animeflv.net/ver/${slug}-${capitulo}`;

      const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' };

      // 2. Entramos a la página del capítulo
      const { data } = await axios.get(episodeUrl, { headers }).catch(() => ({ data: null }));
      
      if (!data) return sock.sendMessage(remoteJid, { text: '❌ El capítulo no existe o aún no se estrena.' }, { quoted: msg });

      // 3. Extraemos la variable secreta donde guardan los reproductores
      const videoMatch = data.match(/var videos = (\{.*?\});/);
      if (!videoMatch) return sock.sendMessage(remoteJid, { text: '❌ No pude encontrar los enlaces de video en el código de la página.' }, { quoted: msg });

      const videos = JSON.parse(videoMatch[1]);
      
      // Juntamos los servidores Subtitulados y Latinos en una sola lista
      const allServers = [...(videos.SUB || []), ...(videos.LAT || [])];

      // 4. Cazamos los servidores más vulnerables para robar el MP4 (YourUpload o Mp4Upload)
      const yuServer = allServers.find(s => s.server === 'yourupload');
      const mp4Server = allServers.find(s => s.server === 'mp4upload');

      let finalMp4Url = null;

      if (yuServer) {
        let embedUrl = yuServer.code || yuServer.url;
        if (embedUrl.startsWith('//')) embedUrl = 'https:' + embedUrl;
        
        // Entramos a YourUpload y robamos la etiqueta meta del video
        const yuRes = await axios.get(embedUrl, { headers: { ...headers, Referer: 'https://www3.animeflv.net/' } });
        const match = yuRes.data.match(/property="og:video"\s+content="([^"]+)"/);
        if (match) finalMp4Url = match[1];
      } 
      else if (mp4Server && !finalMp4Url) {
        let embedUrl = mp4Server.code || mp4Server.url;
        if (embedUrl.startsWith('//')) embedUrl = 'https:' + embedUrl;
        
        const mp4Res = await axios.get(embedUrl, { headers: { ...headers, Referer: 'https://www3.animeflv.net/' } });
        const match = mp4Res.data.match(/src:\s*"([^"]+\.mp4)"/);
        if (match) finalMp4Url = match[1];
      }

      if (!finalMp4Url) {
        return sock.sendMessage(remoteJid, { text: '⚠️ *Seguridad Alta:* Los servidores bloquearon la extracción directa del MP4.\n\nTendrás que abrir la página tú mismo para verlo.' }, { quoted: msg });
      }

      cooldowns.set(sender, Date.now());

      // 5. Le pasamos el link virgen a WhatsApp para que lo descargue de fondo
      await sock.sendMessage(remoteJid, {
        document: { url: finalMp4Url },
        mimetype: 'video/mp4',
        fileName: `${nombre} Ep ${capitulo}.mp4`,
        caption: `✅ *EXTRACCIÓN EXITOSA*\n\n🎬 *Anime:* ${nombre}\n🔢 *Capítulo:* ${capitulo}\n👤 *Pedido por:* @${sender.split('@')[0]}`,
        mentions: [sender]
      }, { quoted: msg });

    } catch (e) {
      console.log('❌ Error en scraping:', e.message);
      await sock.sendMessage(remoteJid, { text: '❌ Error interno al procesar la descarga de este episodio.' }, { quoted: msg });
    }
  }
};
