'use strict';

const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

const PROXY_SERVER = 'http://201.217.49.182:8080'; 
const agent = new HttpsProxyAgent(PROXY_SERVER);

const cooldowns = new Map();
const COOLDOWN_TIME = 3 * 60 * 1000; 

module.exports = {
  commands: ['anime', 'descargar'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg, sender } = ctx;
    
    if (cooldowns.has(sender)) {
      const timeLeft = COOLDOWN_TIME - (Date.now() - cooldowns.get(sender));
      if (timeLeft > 0) return sock.sendMessage(remoteJid, { text: `⏳ Espera ${Math.ceil(timeLeft / 60000)} minutos para no saturar la red.` }, { quoted: msg });
    }

    const input = args.join(' ');
    if (!input.includes(' - ')) return sock.sendMessage(remoteJid, { text: '❌ Formato incorrecto. Usa el texto exacto que te dio el buscador.\nEjemplo: .anime jujutsu-kaisen-tv - 1' }, { quoted: msg });

    const partes = input.split(' - ');
    const capitulo = partes.pop().trim();
    const slug = partes.join(' - ').trim(); 
    
    await sock.sendMessage(remoteJid, { text: `🌐 *Conexión VPN Establecida...*\nExtrayendo video de: ${slug} - Ep ${capitulo}` }, { quoted: msg });

    try {
      const episodeUrl = `https://www3.animeflv.net/ver/${slug}-${capitulo}`;
      const headers = { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www3.animeflv.net/'
      };

      const { data } = await axios.get(episodeUrl, { 
        httpsAgent: agent, 
        headers,
        timeout: 15000 
      }).catch(() => ({ data: null }));

      if (!data) return sock.sendMessage(remoteJid, { text: '❌ El capítulo no existe o el servidor proxy falló al cargar la página.' }, { quoted: msg });

      const videoMatch = data.match(/var videos = (\{.*?\});/);
      if (!videoMatch) return sock.sendMessage(remoteJid, { text: '❌ No pude encontrar los enlaces de video en este capítulo.' }, { quoted: msg });

      const videos = JSON.parse(videoMatch[1]);
      const allServers = [...(videos.SUB || []), ...(videos.LAT || [])];

      const yuServer = allServers.find(s => s.server.toLowerCase() === 'yourupload');
      const mp4Server = allServers.find(s => s.server.toLowerCase() === 'mp4upload');
      const gcdnServer = allServers.find(s => s.server.toLowerCase() === 'gcdn');

      let finalMp4Url = null;

      // Intentamos extraer en orden de mejor calidad y menor encriptación
      if (gcdnServer) {
        finalMp4Url = gcdnServer.code || gcdnServer.url;
      } 
      else if (yuServer) {
        let embedUrl = yuServer.code || yuServer.url;
        if (embedUrl.startsWith('//')) embedUrl = 'https:' + embedUrl;
        const yuRes = await axios.get(embedUrl, { httpsAgent: agent, headers, timeout: 10000 }).catch(() => ({ data: '' }));
        const match = yuRes.data.match(/property="og:video"\s+content="([^"]+)"/);
        if (match) finalMp4Url = match[1];
      } 
      else if (mp4Server && !finalMp4Url) {
        let embedUrl = mp4Server.code || mp4Server.url;
        if (embedUrl.startsWith('//')) embedUrl = 'https:' + embedUrl;
        const mp4Res = await axios.get(embedUrl, { httpsAgent: agent, headers, timeout: 10000 }).catch(() => ({ data: '' }));
        const match = mp4Res.data.match(/src:\s*"([^"]+\.mp4)"/);
        if (match) finalMp4Url = match[1];
      }

      if (!finalMp4Url) {
        return sock.sendMessage(remoteJid, { text: `⚠️ *Servidores Protegidos*\nEl video está, pero protegido contra bots. Deberás verlo desde tu navegador con VPN:\n${episodeUrl}` }, { quoted: msg });
      }

      if (finalMp4Url.startsWith('//')) finalMp4Url = 'https:' + finalMp4Url;

      cooldowns.set(sender, Date.now());

      await sock.sendMessage(remoteJid, { text: `✅ *Enlace vulnerado.*\nDescargando archivo completo a WhatsApp. Esto puede tardar varios minutos dependiendo del peso del video...` }, { quoted: msg });

      await sock.sendMessage(remoteJid, {
        document: { url: finalMp4Url },
        mimetype: 'video/mp4',
        fileName: `${slug}-Ep${capitulo}.mp4`,
        caption: `✅ *ENTREGA DE ANIME*\n\n🎬 *Código:* ${slug}\n🔢 *Capítulo:* ${capitulo}\n👤 *Pedido por:* @${sender.split('@')[0]}`,
        mentions: [sender]
      }, { quoted: msg });

    } catch (e) {
      console.log('❌ Error interno:', e.message);
      await sock.sendMessage(remoteJid, { text: '❌ Ocurrió un error al forzar la descarga mediante el servidor Proxy.' }, { quoted: msg });
    }
  }
};
