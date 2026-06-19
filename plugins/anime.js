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
    
    await sock.sendMessage(remoteJid, { text: `💻 *Conectando a TioAnime...*\nExtrayendo video de: ${slug} - Ep ${capitulo}` }, { quoted: msg });

    try {
      const episodeUrl = `https://tioanime.com/ver/${slug}-${capitulo}`;
      const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' };

      // 1. Entramos a la página del capítulo
      const { data } = await axios.get(episodeUrl, { headers }).catch(() => ({ data: null }));

      if (!data) return sock.sendMessage(remoteJid, { text: '❌ El capítulo no existe. Asegúrate de haber escrito el número correctamente.' }, { quoted: msg });

      // 2. TioAnime guarda los videos en una variable llamada "videos"
      const videoMatch = data.match(/var videos = (\[.*?\]);/);
      if (!videoMatch) return sock.sendMessage(remoteJid, { text: '❌ No pude encontrar los enlaces de video en el código.' }, { quoted: msg });

      const videos = JSON.parse(videoMatch[1]);

      // Buscamos Mp4Upload o YourUpload
      const mp4Server = videos.find(s => s[0].toLowerCase() === 'mp4upload');
      const yuServer = videos.find(s => s[0].toLowerCase() === 'yourupload');

      let finalMp4Url = null;

      if (mp4Server) {
        let embedUrl = mp4Server[1];
        const mp4Res = await axios.get(embedUrl, { headers: { ...headers, Referer: 'https://tioanime.com/' } }).catch(() => ({ data: '' }));
        const match = mp4Res.data.match(/src:\s*"([^"]+\.mp4)"/i);
        if (match) finalMp4Url = match[1];
      } 
      else if (yuServer && !finalMp4Url) {
        let embedUrl = yuServer[1];
        const yuRes = await axios.get(embedUrl, { headers: { ...headers, Referer: 'https://tioanime.com/' } }).catch(() => ({ data: '' }));
        const match = yuRes.data.match(/property="og:video"\s+content="([^"]+)"/);
        if (match) finalMp4Url = match[1];
      }

      if (!finalMp4Url) {
        return sock.sendMessage(remoteJid, { text: `⚠️ *Seguridad Alta:* Los servidores bloquearon la extracción del MP4.\nÁbrelo manualmente en tu navegador para verlo:\n${episodeUrl}` }, { quoted: msg });
      }

      cooldowns.set(sender, Date.now());

      await sock.sendMessage(remoteJid, { text: `✅ *Extracción Exitosa.*\nEnviando capítulo. Esto tomará unos minutos dependiendo del peso...` }, { quoted: msg });

      // Enviamos el video
      await sock.sendMessage(remoteJid, {
        document: { url: finalMp4Url },
        mimetype: 'video/mp4',
        fileName: `${slug}-Ep${capitulo}.mp4`,
        caption: `✅ *ENTREGA DE ANIME*\n\n🎬 *Código:* ${slug}\n🔢 *Capítulo:* ${capitulo}\n👤 *Pedido por:* @${sender.split('@')[0]}`,
        mentions: [sender]
      }, { quoted: msg });

    } catch (e) {
      console.log('❌ Error en scraping:', e.message);
      await sock.sendMessage(remoteJid, { text: '❌ Ocurrió un error al intentar descargar este episodio.' }, { quoted: msg });
    }
  }
};
