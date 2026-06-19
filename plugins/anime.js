'use strict';

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios'); // Necesario para crear el Túnel a WhatsApp

puppeteer.use(StealthPlugin());

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
    if (!input.includes(' - ')) return sock.sendMessage(remoteJid, { text: '❌ Formato incorrecto.\nEjemplo: .anime jujutsu-kaisen-2nd-season - 1' }, { quoted: msg });

    const partes = input.split(' - ');
    const capitulo = partes.pop().trim();
    const slug = partes.join(' - ').trim(); 
    
    await sock.sendMessage(remoteJid, { text: `🤖 *Infiltración iniciada...*\nAnalizando el código fuente de AnimeFLV para el Ep ${capitulo}.` }, { quoted: msg });

    let browser;
    try {
      browser = await puppeteer.launch({
        executablePath: '/usr/bin/chromium-browser',
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled']
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36');
      
      const episodeUrl = `https://www3.animeflv.net/ver/${slug}-${capitulo}`;
      
      // 1. Entramos a la página oficial
      await page.goto(episodeUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      
      // 2. Extraemos TODO el código de la página (Más seguro que evaluate)
      const html = await page.content();
      const videoMatch = html.match(/var videos = (\{.*?\});/);

      if (!videoMatch) {
        await browser.close();
        return sock.sendMessage(remoteJid, { text: '❌ El capítulo aún no existe o AnimeFLV cambió su código de seguridad.' }, { quoted: msg });
      }

      const videos = JSON.parse(videoMatch[1]);
      const allServers = [...(videos.SUB || []), ...(videos.LAT || [])];

      // 3. Buscamos los servidores extraíbles (Mp4Upload o YourUpload)
      const mp4Server = allServers.find(s => s.server.toLowerCase() === 'mp4upload');
      const yuServer = allServers.find(s => s.server.toLowerCase() === 'yourupload');

      let finalMp4Url = null;
      let hostDeVideo = null; // Guardaremos esto para engañar a su seguridad luego

      if (mp4Server) {
        let embedUrl = mp4Server.code || mp4Server.url;
        if (embedUrl.startsWith('//')) embedUrl = 'https:' + embedUrl;
        hostDeVideo = embedUrl;
        
        await page.goto(embedUrl, { waitUntil: 'domcontentloaded' });
        const embedHtml = await page.content();
        // Buscamos el link mp4 exacto con Regex
        const match = embedHtml.match(/src:\s*["']([^"']+\.mp4)["']/i);
        if (match) finalMp4Url = match[1];
      } 
      
      if (!finalMp4Url && yuServer) {
        let embedUrl = yuServer.code || yuServer.url;
        if (embedUrl.startsWith('//')) embedUrl = 'https:' + embedUrl;
        hostDeVideo = embedUrl;

        await page.goto(embedUrl, { waitUntil: 'domcontentloaded' });
        const embedHtml = await page.content();
        const match = embedHtml.match(/property="og:video"\s+content="([^"]+)"/);
        if (match) finalMp4Url = match[1];
      }

      await browser.close();

      if (!finalMp4Url) {
        return sock.sendMessage(remoteJid, { text: `⚠️ *Servidores Bloqueados:* \nEste capítulo solo está en Mega o Stape y no se puede extraer automáticamente.\nÁbrelo manualmente aquí:\n${episodeUrl}` }, { quoted: msg });
      }

      cooldowns.set(sender, Date.now());

      await sock.sendMessage(remoteJid, { text: `✅ *Enlace vulnerado.*\nCreando túnel de descarga directo a WhatsApp. Puede tardar un poco dependiendo del peso...` }, { quoted: msg });

      // 4. CREAMOS EL TÚNEL A WHATSAPP
      // Usamos Axios para descargar el video simulando que estamos en la página (Referer)
      const { data: videoStream } = await axios.get(finalMp4Url, {
        responseType: 'stream',
        headers: {
          'Referer': hostDeVideo, // El truco maestro
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      // Baileys usa el stream para enviar el archivo sin colapsar la RAM de Clouding
      await sock.sendMessage(remoteJid, {
        document: { stream: videoStream },
        mimetype: 'video/mp4',
        fileName: `${slug}-Ep${capitulo}.mp4`,
        caption: `✅ *HACKEO EXITOSO*\n\n🎬 *Código:* ${slug}\n🔢 *Capítulo:* ${capitulo}\n👤 *Pedido por:* @${sender.split('@')[0]}`,
        mentions: [sender]
      }, { quoted: msg });

    } catch (e) {
      if (browser) await browser.close();
      console.log('❌ Error crítico en anime.js:', e.message);
      await sock.sendMessage(remoteJid, { text: '❌ Ocurrió un error al forzar la descarga.' }, { quoted: msg });
    }
  }
};
