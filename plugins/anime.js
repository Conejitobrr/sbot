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
    
    await sock.sendMessage(remoteJid, { text: `💻 *Conectando a TioAnime...*\nHackeando servidores rusos para extraer: ${slug} - Ep ${capitulo}` }, { quoted: msg });

    try {
      const episodeUrl = `https://tioanime.com/ver/${slug}-${capitulo}`;
      const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' };

      // 1. Entramos a la página del capítulo en TioAnime
      const { data } = await axios.get(episodeUrl, { headers }).catch(() => ({ data: null }));

      if (!data) return sock.sendMessage(remoteJid, { text: '❌ El capítulo no existe. Asegúrate de haber escrito el número correctamente.' }, { quoted: msg });

      // 2. Extraemos el bloque de servidores de TioAnime
      const videoMatch = data.match(/var videos = (\[.*?\]);/);
      if (!videoMatch) return sock.sendMessage(remoteJid, { text: '❌ No pude encontrar los enlaces de video en el código.' }, { quoted: msg });

      const videos = JSON.parse(videoMatch[1]);

      // 3. Cazamos los servidores específicos que usa TioAnime (Ok.ru y Uqload)
      const okruServer = videos.find(s => s[0].toLowerCase() === 'okru');
      const uqloadServer = videos.find(s => s[0].toLowerCase() === 'uqload');

      let finalMp4Url = null;

      // 🔥 HACKEO DE OK.RU (Servidor Ruso)
      if (okruServer) {
        let okruUrl = okruServer[1];
        if (okruUrl.startsWith('//')) okruUrl = 'https:' + okruUrl;
        
        try {
          const okRes = await axios.get(okruUrl, { headers });
          // Ok.ru esconde los videos dentro de un atributo "data-options" en formato JSON
          const match = okRes.data.match(/data-options="([^"]+)"/);
          if (match) {
            // Limpiamos el texto para convertirlo en JSON real
            const jsonStr = match[1].replace(/&quot;/g, '"');
            const options = JSON.parse(jsonStr);
            const metadata = JSON.parse(options.flashvars.metadata);
            
            // Buscamos la calidad HD o SD
            const hdVideo = metadata.videos.find(v => v.name === 'hd' || v.name === 'sd' || v.name === 'mobile');
            if (hdVideo) finalMp4Url = hdVideo.url;
          }
        } catch (err) {
          console.log('Fallo al extraer Ok.ru');
        }
      } 
      // 🔥 HACKEO DE UQLOAD (Servidor Alternativo)
      else if (uqloadServer && !finalMp4Url) {
        let uqUrl = uqloadServer[1];
        if (uqUrl.startsWith('//')) uqUrl = 'https:' + uqUrl;
        
        try {
          const uqRes = await axios.get(uqUrl, { headers });
          const match = uqRes.data.match(/sources:\s*\["([^"]+)"\]/);
          if (match) finalMp4Url = match[1];
        } catch (err) {
          console.log('Fallo al extraer Uqload');
        }
      }

      if (!finalMp4Url) {
        return sock.sendMessage(remoteJid, { text: `⚠️ *Seguridad Alta:* Los servidores secundarios ocultaron el archivo.\nÁbrelo manualmente en tu navegador para verlo:\n${episodeUrl}` }, { quoted: msg });
      }

      cooldowns.set(sender, Date.now());

      await sock.sendMessage(remoteJid, { text: `✅ *Enlace vulnerado (Servidor Ok.ru / Uqload).*\nDescargando archivo completo a WhatsApp. Esto tomará un par de minutos...` }, { quoted: msg });

      // 4. Enviamos el video directamente a WhatsApp
      await sock.sendMessage(remoteJid, {
        document: { url: finalMp4Url },
        mimetype: 'video/mp4',
        fileName: `${slug}-Ep${capitulo}.mp4`,
        caption: `✅ *ENTREGA DE ANIME*\n\n🎬 *Código:* ${slug}\n🔢 *Capítulo:* ${capitulo}\n👤 *Pedido por:* @${sender.split('@')[0]}`,
        mentions: [sender]
      }, { quoted: msg });

    } catch (e) {
      console.log('❌ Error en scraping de TioAnime:', e.message);
      await sock.sendMessage(remoteJid, { text: '❌ Ocurrió un error al intentar descargar este episodio.' }, { quoted: msg });
    }
  }
};
