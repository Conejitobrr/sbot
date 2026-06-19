'use strict';

const axios = require('axios');

const cooldowns = new Map();
const COOLDOWN_TIME = 2 * 60 * 1000; 

// 🔥 TÚNEL ANTI-CLOUDFLARE: Engaña a TioAnime usando APIs de extracción públicas
async function obtenerCodigoFuente(urlObjetivo) {
  try {
    const res = await axios.get(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(urlObjetivo)}`, { timeout: 15000 });
    return typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
  } catch (error1) {
    try {
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
      if (timeLeft > 0) return sock.sendMessage(remoteJid, { text: `⏳ Espera ${Math.ceil(timeLeft / 60000)} minutos.` }, { quoted: msg });
    }

    const input = args.join(' ');
    if (!input.includes(' - ')) return sock.sendMessage(remoteJid, { text: '❌ Formato incorrecto.\nEjemplo: .anime jujutsu-kaisen-tv - 1' }, { quoted: msg });

    const partes = input.split(' - ');
    const capitulo = partes.pop().trim();
    const slug = partes.join(' - ').trim(); 
    
    await sock.sendMessage(remoteJid, { text: `💻 *Hackeando TioAnime mediante Túneles...*\nEvadiendo Cloudflare para extraer el Ep ${capitulo}` }, { quoted: msg });

    try {
      const episodeUrl = `https://tioanime.com/ver/${slug}-${capitulo}`;
      
      // En lugar de ir directos, pasamos la URL por el túnel para saltar el bloqueo
      const data = await obtenerCodigoFuente(episodeUrl);

      if (!data) return sock.sendMessage(remoteJid, { text: '❌ El túnel falló o la página de TioAnime está en mantenimiento.' }, { quoted: msg });

      // ==========================================
      // FASE 1: HACKEO DEL REPRODUCTOR (Intento de MP4)
      // ==========================================
      const videoMatch = data.match(/var videos = (\[.*?\]);/);
      let finalMp4Url = null;

      if (videoMatch) {
        const videos = JSON.parse(videoMatch[1]);
        const okruServer = videos.find(s => s[0].toLowerCase() === 'okru');
        
        if (okruServer) {
          let okruUrl = okruServer[1];
          if (okruUrl.startsWith('//')) okruUrl = 'https:' + okruUrl;
          try {
            const okRes = await axios.get(okruUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const match = okRes.data.match(/data-options="([^"]+)"/);
            if (match) {
              const options = JSON.parse(match[1].replace(/&quot;/g, '"'));
              const metadata = JSON.parse(options.flashvars.metadata);
              // Forzamos a buscar la mejor calidad
              const hdVideo = metadata.videos.find(v => v.name === 'hd' || v.name === 'sd');
              if (hdVideo) finalMp4Url = hdVideo.url;
            }
          } catch (err) { /* Ignoramos si falla para pasar a Fase 2 */ }
        }
      }

      // ==========================================
      // FASE 2: EXTRACCIÓN DE LINKS VIP DE DESCARGA
      // ==========================================
      const downloadsMatch = data.match(/var downloads = (\[.*?\]);/);
      let enlacesTexto = '';

      if (downloadsMatch) {
        const downloads = JSON.parse(downloadsMatch[1]);
        downloads.forEach(d => {
          enlacesTexto += `*${d[0]}:* ${d[1]}\n`;
        });
      }

      // Si tenemos el MP4 directo, a WhatsApp
      if (finalMp4Url) {
        cooldowns.set(sender, Date.now());
        await sock.sendMessage(remoteJid, { text: `✅ *Seguridad Bypasseada.*\nDescargando video pesado a WhatsApp. Espera unos minutos...` }, { quoted: msg });

        return await sock.sendMessage(remoteJid, {
          document: { url: finalMp4Url },
          mimetype: 'video/mp4',
          fileName: `${slug}-Ep${capitulo}.mp4`,
          caption: `✅ *ANIME DESCARGADO*\n\n🎬 *Código:* ${slug}\n🔢 *Capítulo:* ${capitulo}\n👤 *Pedido por:* @${sender.split('@')[0]}`,
          mentions: [sender]
        }, { quoted: msg });
      }

      // Si falló el MP4 pero salvamos los links
      if (enlacesTexto !== '') {
        const mensajeLinks = 
`⚠️ *RESTRICCIÓN DE VIDEO (Bypass Exitoso)* ⚠️
El archivo MP4 directo bloqueó la descarga, pero logré extraer los **Enlaces VIP de Descarga** saltando el Cloudflare.

Baja el capítulo en calidad HD directamente desde aquí:

${enlacesTexto}

💡 *Recomendación:* Usa Mega o Mediafire.`;

        return sock.sendMessage(remoteJid, { text: mensajeLinks }, { quoted: msg });
      }

      // El último recurso
      return sock.sendMessage(remoteJid, { text: `❌ *Bloqueo Total:* TioAnime actualizó su seguridad anti-bots el día de hoy.\nTendrás que ir a la página manualmente:\n${episodeUrl}` }, { quoted: msg });

    } catch (e) {
      console.log('❌ Error en híbrido:', e.message);
      await sock.sendMessage(remoteJid, { text: '❌ Ocurrió un error interno al conectar con los túneles.' }, { quoted: msg });
    }
  }
};
