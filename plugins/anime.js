'use strict';

const axios = require('axios');

const cooldowns = new Map();
const COOLDOWN_TIME = 2 * 60 * 1000; 

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
    
    await sock.sendMessage(remoteJid, { text: `💻 *Infiltración en TioAnime...*\nIntentando extraer el video o los enlaces VIP de: ${slug} - Ep ${capitulo}` }, { quoted: msg });

    try {
      const episodeUrl = `https://tioanime.com/ver/${slug}-${capitulo}`;
      const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' };

      const { data } = await axios.get(episodeUrl, { headers }).catch(() => ({ data: null }));

      if (!data) return sock.sendMessage(remoteJid, { text: '❌ El capítulo no existe o la página está en mantenimiento.' }, { quoted: msg });

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
            const okRes = await axios.get(okruUrl, { headers });
            const match = okRes.data.match(/data-options="([^"]+)"/);
            if (match) {
              const options = JSON.parse(match[1].replace(/&quot;/g, '"'));
              const metadata = JSON.parse(options.flashvars.metadata);
              const hdVideo = metadata.videos.find(v => v.name === 'hd' || v.name === 'sd');
              if (hdVideo) finalMp4Url = hdVideo.url;
            }
          } catch (err) { /* Ignoramos el error para pasar a la Fase 2 */ }
        }
      }

      // ==========================================
      // FASE 2: EXTRACCIÓN DE LINKS VIP DE DESCARGA
      // ==========================================
      // TioAnime guarda los enlaces de descarga (Mega, Mediafire) en otra variable oculta
      const downloadsMatch = data.match(/var downloads = (\[.*?\]);/);
      let enlacesTexto = '';

      if (downloadsMatch) {
        const downloads = JSON.parse(downloadsMatch[1]);
        downloads.forEach(d => {
          // d[0] es el nombre del servidor (Mega, Mediafire), d[1] es el link
          enlacesTexto += `*${d[0]}:* ${d[1]}\n`;
        });
      }

      // Si tenemos el MP4 directo, lo enviamos a WhatsApp
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

      // ==========================================
      // FASE 3: PLAN DE RESPALDO (Entregar Links)
      // ==========================================
      // Si el MP4 falló, pero logramos robar los links directos de Mega/Mediafire
      if (enlacesTexto !== '') {
        const mensajeLinks = 
`⚠️ *RESTRICCIÓN DE VIDEO* ⚠️
Los servidores ocultaron el video directo, pero **¡hackeé sus enlaces privados de descarga!**

Descarga el capítulo en 1 clic desde tu servidor favorito:

${enlacesTexto}

💡 *Recomendación:* Usa el link de Mediafire o Mega para bajarlo rápido a tu celular o PC.`;

        return sock.sendMessage(remoteJid, { text: mensajeLinks }, { quoted: msg });
      }

      // Si todo falla
      return sock.sendMessage(remoteJid, { text: `❌ *Bloqueo Total:* TioAnime bloqueó la extracción y ocultó los links.\nTendrás que ir a la página: ${episodeUrl}` }, { quoted: msg });

    } catch (e) {
      console.log('❌ Error en híbrido:', e.message);
      await sock.sendMessage(remoteJid, { text: '❌ Ocurrió un error interno al buscar el capítulo.' }, { quoted: msg });
    }
  }
};
