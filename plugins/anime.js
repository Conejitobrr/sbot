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
    // Obligamos a que use "espacio guion espacio" para no confundir los códigos
    if (!input.includes(' - ')) return sock.sendMessage(remoteJid, { text: '❌ Formato incorrecto. Recuerda usar espacio, guion, espacio.\nEjemplo: .anime naruto-shippuden - 1' }, { quoted: msg });

    const partes = input.split(' - ');
    const capitulo = partes.pop().trim();
    const slug = partes.join(' - ').trim(); 
    
    await sock.sendMessage(remoteJid, { text: `💻 *Hackeando AnimeFLV...*\nExtrayendo video de: ${slug} - Ep ${capitulo}` }, { quoted: msg });

    try {
      // Entramos directamente con el Slug perfecto
      const episodeUrl = `https://www3.animeflv.net/ver/${slug}-${capitulo}`;
      const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' };

      const { data } = await axios.get(episodeUrl, { headers }).catch(() => ({ data: null }));
      if (!data) return sock.sendMessage(remoteJid, { text: '❌ El capítulo no existe. Asegúrate de haber escrito el número correctamente.' }, { quoted: msg });

      const videoMatch = data.match(/var videos = (\{.*?\});/);
      if (!videoMatch) return sock.sendMessage(remoteJid, { text: '❌ No pude encontrar los enlaces de video.' }, { quoted: msg });

      const videos = JSON.parse(videoMatch[1]);
      const allServers = [...(videos.SUB || []), ...(videos.LAT || [])];

      const yuServer = allServers.find(s => s.server === 'yourupload');
      const mp4Server = allServers.find(s => s.server === 'mp4upload');

      let finalMp4Url = null;

      if (yuServer) {
        let embedUrl = yuServer.code || yuServer.url;
        if (embedUrl.startsWith('//')) embedUrl = 'https:' + embedUrl;
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
        return sock.sendMessage(remoteJid, { text: `⚠️ *Seguridad Alta:* No se pudo extraer el MP4 directo de los servidores gratuitos.\n\nÁbrelo manualmente para verlo en el navegador o en tu TV:\n${episodeUrl}` }, { quoted: msg });
      }

      cooldowns.set(sender, Date.now());

      await sock.sendMessage(remoteJid, {
        document: { url: finalMp4Url },
        mimetype: 'video/mp4',
        fileName: `${slug}-Ep${capitulo}.mp4`,
        caption: `✅ *EXTRACCIÓN EXITOSA*\n\n🎬 *Código:* ${slug}\n🔢 *Capítulo:* ${capitulo}\n👤 *Pedido por:* @${sender.split('@')[0]}`,
        mentions: [sender]
      }, { quoted: msg });

    } catch (e) {
      console.log('❌ Error en scraping:', e.message);
      await sock.sendMessage(remoteJid, { text: '❌ Error interno al descargar este episodio.' }, { quoted: msg });
    }
  }
};
