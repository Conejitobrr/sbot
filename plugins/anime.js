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
    
    await sock.sendMessage(remoteJid, { text: `💻 *Infiltración Directa en TioAnime...*\nExtrayendo video o enlaces VIP de: ${slug} - Ep ${capitulo}` }, { quoted: msg });

    try {
      const episodeUrl = `https://tioanime.com/ver/${slug}-${capitulo}`;
      const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' };

      // Conexión DIRECTA, sin túneles ni VPNs que estorben
      const { data } = await axios.get(episodeUrl, { headers }).catch(() => ({ data: null }));

      if (!data) return sock.sendMessage(remoteJid, { text: '❌ El capítulo no existe o escribiste mal el código.' }, { quoted: msg });

      // ==========================================
      // FASE 1: INTENTO DE HACKEO DEL MP4 (Ok.ru)
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
          } catch (err) { /* Ignoramos si falla para pasar directo a los links VIP */ }
        }
      }

      // ==========================================
      // FASE 2: EXTRACCIÓN DE ENLACES DE DESCARGA
      // ==========================================
      const downloadsMatch = data.match(/var downloads = (\[.*?\]);/);
      let enlacesTexto = '';

      if (downloadsMatch) {
        const downloads = JSON.parse(downloadsMatch[1]);
        downloads.forEach(d => {
          // d[0] = Servidor (Mega, Mediafire), d[1] = Link
          enlacesTexto += `*${d[0]}:* ${d[1]}\n`;
        });
      }

      cooldowns.set(sender, Date.now());

      // ==========================================
      // RESULTADOS
      // ==========================================
      
      // Si logramos sacar el MP4 ruso, lo mandamos directo a WhatsApp
      if (finalMp4Url) {
        await sock.sendMessage(remoteJid, { text: `✅ *Archivo vulnerado.*\nDescargando video pesado a WhatsApp. Espera unos minutos...` }, { quoted: msg });

        return await sock.sendMessage(remoteJid, {
          document: { url: finalMp4Url },
          mimetype: 'video/mp4',
          fileName: `${slug}-Ep${capitulo}.mp4`,
          caption: `✅ *ANIME DESCARGADO*\n\n🎬 *Código:* ${slug}\n🔢 *Capítulo:* ${capitulo}\n👤 *Pedido por:* @${sender.split('@')[0]}`,
          mentions: [sender]
        }, { quoted: msg });
      }

      // Si el MP4 falló, pero salvamos los links VIP
      if (enlacesTexto !== '') {
        const mensajeLinks = 
`⚠️ *RESTRICCIÓN DE VIDEO SUPERADA* ⚠️
El servidor ocultó el video directo para WhatsApp, pero logré extraer los **Enlaces VIP de Descarga**.

Descarga el capítulo completo en HD desde aquí:

${enlacesTexto}

💡 *Sugerencia:* Usa el enlace de Mega o Mediafire para descargarlo súper rápido.`;

        return sock.sendMessage(remoteJid, { text: mensajeLinks }, { quoted: msg });
      }

      // Si definitivamente no hay nada
      return sock.sendMessage(remoteJid, { text: `❌ *Servidores Vacíos:* TioAnime aún no sube los enlaces de este capítulo.\nTendrás que ir a la página manualmente:\n${episodeUrl}` }, { quoted: msg });

    } catch (e) {
      console.log('❌ Error en ejecución directa:', e.message);
      await sock.sendMessage(remoteJid, { text: '❌ Ocurrió un error interno al buscar el capítulo.' }, { quoted: msg });
    }
  }
};
