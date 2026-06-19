'use strict';

const axios = require('axios');
const cheerio = require('cheerio');
const { HttpsProxyAgent } = require('https-proxy-agent');

const cooldowns = new Map();
const COOLDOWN_TIME = 3 * 60 * 1000; // Bajado a 3 minutos

// 🌎 LISTA DE VPNS/PROXIES GRATUITOS INTERNACIONALES
// Si notas que el comando se queda cargando, puedes cambiar esta IP por otra de 'https://free-proxy-list.net/'
const PROXY_SERVER = 'http://45.70.14.20:8080'; // Servidor Proxy fuera de Perú
const agent = new HttpsProxyAgent(PROXY_SERVER);

module.exports = {
  commands: ['anime', 'descargar'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg, sender } = ctx;
    
    if (cooldowns.has(sender)) {
      const timeLeft = COOLDOWN_TIME - (Date.now() - cooldowns.get(sender));
      if (timeLeft > 0) return sock.sendMessage(remoteJid, { text: `⏳ Espera ${Math.ceil(timeLeft / 60000)} minutos.` }, { quoted: msg });
    }

    const input = args.join(' ');
    if (!input.includes(' - ')) return sock.sendMessage(remoteJid, { text: '❌ Formato: .anime nombre-del-anime - capitulo' }, { quoted: msg });

    const partes = input.split(' - ');
    const capitulo = partes.pop().trim();
    const slug = partes.join(' - ').trim(); 
    
    await sock.sendMessage(remoteJid, { text: `🌐 *Activando Túnel VPN del Bot...*\nConectando mediante servidor proxy internacional para evadir el bloqueo de Perú...` }, { quoted: msg });

    try {
      const episodeUrl = `https://www3.animeflv.net/ver/${slug}-${capitulo}`;
      
      // 🛠️ HACEMOS LA PETICIÓN USANDO EL AGENTE VPN (PROXY)
      const { data } = await axios.get(episodeUrl, {
        httpsAgent: agent,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www3.animeflv.net/'
        },
        timeout: 15000 // Si el proxy tarda más de 15 segundos, dará error para no congelar el bot
      });

      if (!data) return sock.sendMessage(remoteJid, { text: '❌ El capítulo no se encuentra disponible.' }, { quoted: msg });

      // Extraemos los videos ocultos en el código
      const videoMatch = data.match(/var videos = (\{.*?\});/);
      if (!videoMatch) return sock.sendMessage(remoteJid, { text: '❌ No se encontraron servidores de video válidos.' }, { quoted: msg });

      const videos = JSON.parse(videoMatch[1]);
      const allServers = [...(videos.SUB || []), ...(videos.LAT || [])];

      // 📥 BUSCAMOS CAPÍTULOS COMPLETOS (Prioridad: GoCDN, YourUpload, Mp4Upload)
      const gcdnServer = allServers.find(s => s.server.toLowerCase() === 'gcdn');
      const yuServer = allServers.find(s => s.server.toLowerCase() === 'yourupload');
      
      let linkDeDescarga = null;

      if (gcdnServer) {
        linkDeDescarga = gcdnServer.code || gcdnServer.url;
      } else if (yuServer) {
        let embedUrl = yuServer.code || yuServer.url;
        if (embedUrl.startsWith('//')) embedUrl = 'https:' + embedUrl;
        
        // Usamos la VPN también para extraer el MP4 desde YourUpload
        const yuRes = await axios.get(embedUrl, { httpsAgent: agent, headers: { 'Referer': 'https://www3.animeflv.net/' } });
        const match = yuRes.data.match(/property="og:video"\s+content="([^"]+)"/);
        if (match) linkDeDescarga = match[1];
      }

      if (!linkDeDescarga) {
        return sock.sendMessage(remoteJid, { 
          text: `⚠️ *Capítulo Encontrado por VPN* ⚠️\n\nEl archivo está completo en HD, pero requiere descarga manual desde el reproductor externo:\n${episodeUrl}` 
        }, { quoted: msg });
      }

      if (linkDeDescarga.startsWith('//')) linkDeDescarga = 'https:' + linkDeDescarga;

      cooldowns.set(sender, Date.now());
      await sock.sendMessage(remoteJid, { text: `✅ *Conexión Exitosa.*\nEnviando capítulo completo en formato de Documento. Espera a que cargue...` }, { quoted: msg });

      // Enviamos el video directamente
      await sock.sendMessage(remoteJid, {
        document: { url: linkDeDescarga },
        mimetype: 'video/mp4',
        fileName: `${slug}-Capitulo-${capitulo}.mp4`,
        caption: `📺 *ANIME COMPLETO EN HD*\n\n🎬 *Anime:* ${slug}\n🔢 *Capítulo:* ${capitulo}\n👤 *Pedido por:* @${sender.split('@')[0]}\n\n_Disfruta el episodio sin bloqueos regionales._`,
        mentions: [sender]
      }, { quoted: msg });

    } catch (e) {
      console.log('❌ Error en anime con VPN:', e.message);
      await sock.sendMessage(remoteJid, { 
        text: '❌ El servidor VPN configurado está lento o inactivo. Inténtalo de nuevo o avísale al dueño del bot para actualizar la IP del proxy.' 
      }, { quoted: msg });
    }
  }
};
