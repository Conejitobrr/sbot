'use strict';

const axios = require('axios');

const cooldowns = new Map();
const COOLDOWN_TIME = 2 * 60 * 1000; // 2 minutos

// 🔥 FUNCIÓN MAESTRA: Evade el bloqueo de España/Perú usando APIs de Proxy gratuitas que nunca mueren
async function obtenerCodigoFuente(urlObjetivo) {
  try {
    // Intento 1: API CodeTabs
    const res = await axios.get(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(urlObjetivo)}`, { timeout: 15000 });
    return typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
  } catch (error1) {
    try {
      // Intento 2: API AllOrigins (Respaldo)
      const res2 = await axios.get(`https://api.allorigins.win/raw?url=${encodeURIComponent(urlObjetivo)}`, { timeout: 15000 });
      return typeof res2.data === 'string' ? res2.data : JSON.stringify(res2.data);
    } catch (error2) {
      return null;
    }
  }
}

module.exports = {
  commands: ['anime', 'descargar'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg, sender } = ctx;
    
    if (cooldowns.has(sender)) {
      const timeLeft = COOLDOWN_TIME - (Date.now() - cooldowns.get(sender));
      if (timeLeft > 0) return sock.sendMessage(remoteJid, { text: `⏳ Espera ${Math.ceil(timeLeft / 60000)} minutos para no saturar al bot.` }, { quoted: msg });
    }

    const input = args.join(' ');
    if (!input.includes(' - ')) return sock.sendMessage(remoteJid, { text: '❌ Formato incorrecto. Usa el texto que te dio el buscador.\nEjemplo: .anime jujutsu-kaisen-tv - 1' }, { quoted: msg });

    const partes = input.split(' - ');
    const capitulo = partes.pop().trim();
    const slug = partes.join(' - ').trim(); 
    
    await sock.sendMessage(remoteJid, { text: `🌐 *Túnel API Activado...*\nEvadiendo el bloqueo de España y buscando el Ep ${capitulo}.` }, { quoted: msg });

    try {
      const episodeUrl = `https://www3.animeflv.net/ver/${slug}-${capitulo}`;
      
      // Obtenemos el código de la página a través de nuestros túneles
      const html = await obtenerCodigoFuente(episodeUrl);

      if (!html) return sock.sendMessage(remoteJid, { text: '❌ El capítulo no existe o las puertas de AnimeFLV están cerradas temporalmente.' }, { quoted: msg });

      // Buscamos la variable donde esconden los videos
      const videoMatch = html.match(/var videos = (\{.*?\});/);
      if (!videoMatch) return sock.sendMessage(remoteJid, { text: '❌ AnimeFLV tiene el capítulo protegido, no pude extraer los enlaces.' }, { quoted: msg });

      const videos = JSON.parse(videoMatch[1]);
      const allServers = [...(videos.SUB || []), ...(videos.LAT || [])];

      // Cazamos servidores de prioridad (GoCDN, YourUpload, Mp4Upload)
      const gcdnServer = allServers.find(s => s.server.toLowerCase() === 'gcdn');
      const yuServer = allServers.find(s => s.server.toLowerCase() === 'yourupload');
      const mp4Server = allServers.find(s => s.server.toLowerCase() === 'mp4upload');

      let finalMp4Url = null;

      if (gcdnServer) {
        finalMp4Url = gcdnServer.code || gcdnServer.url;
      } 
      else if (yuServer) {
        let embedUrl = yuServer.code || yuServer.url;
        if (embedUrl.startsWith('//')) embedUrl = 'https:' + embedUrl;
        // Usamos el túnel de nuevo para robar el link dentro del reproductor
        const yuHtml = await obtenerCodigoFuente(embedUrl);
        if (yuHtml) {
          const match = yuHtml.match(/property="og:video"\s+content="([^"]+)"/);
          if (match) finalMp4Url = match[1];
        }
      } 
      else if (mp4Server && !finalMp4Url) {
        let embedUrl = mp4Server.code || mp4Server.url;
        if (embedUrl.startsWith('//')) embedUrl = 'https:' + embedUrl;
        const mp4Html = await obtenerCodigoFuente(embedUrl);
        if (mp4Html) {
          const match = mp4Html.match(/src:\s*"([^"]+\.mp4)"/i);
          if (match) finalMp4Url = match[1];
        }
      }

      if (!finalMp4Url) {
        return sock.sendMessage(remoteJid, { text: `⚠️ *Seguridad Alta*\nEncontré el video, pero está encriptado por Mega o Stape.\n\nTendrás que abrirlo manualmente:\n${episodeUrl}` }, { quoted: msg });
      }

      // Si le falta el "https:", se lo ponemos
      if (finalMp4Url.startsWith('//')) finalMp4Url = 'https:' + finalMp4Url;

      cooldowns.set(sender, Date.now());

      await sock.sendMessage(remoteJid, { text: `✅ *Enlace Extraído con Éxito*\n\nDescargando video... Si el capítulo pesa mucho, WhatsApp podría tardar unos minutos en recibirlo.` }, { quoted: msg });

      // Enviamos el Documento MP4 a WhatsApp
      await sock.sendMessage(remoteJid, {
        document: { url: finalMp4Url },
        mimetype: 'video/mp4',
        fileName: `${slug}-Ep${capitulo}.mp4`,
        caption: `✅ *ENTREGA DE ANIME*\n\n🎬 *Código:* ${slug}\n🔢 *Capítulo:* ${capitulo}\n👤 *Pedido por:* @${sender.split('@')[0]}`,
        mentions: [sender]
      }, { quoted: msg });

    } catch (e) {
      console.log('❌ Error en anime.js:', e.message);
      await sock.sendMessage(remoteJid, { text: '❌ Error interno al procesar el archivo de video.' }, { quoted: msg });
    }
  }
};
