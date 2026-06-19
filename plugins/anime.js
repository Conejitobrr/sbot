'use strict';

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Activamos el modo sigilo para que AnimeFLV no sepa que somos un bot
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
    if (!input.includes(' - ')) return sock.sendMessage(remoteJid, { text: '❌ Formato incorrecto. Recuerda usar espacio, guion, espacio.\nEjemplo: .anime jujutsu-kaisen-2nd-season - 1' }, { quoted: msg });

    const partes = input.split(' - ');
    const capitulo = partes.pop().trim();
    const slug = partes.join(' - ').trim(); 
    
    await sock.sendMessage(remoteJid, { text: `🤖 *Navegador Fantasma activado...*\nBypasseando la seguridad de AnimeFLV para extraer el Ep ${capitulo}. Dame unos segundos.` }, { quoted: msg });

    let browser;
    try {
      // Iniciamos el mismo navegador pesado que usamos para Google
      browser = await puppeteer.launch({
        executablePath: '/usr/bin/chromium-browser',
        headless: 'new',
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled'
        ]
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      const episodeUrl = `https://www3.animeflv.net/ver/${slug}-${capitulo}`;
      
      // Entramos a la página y esperamos a que cargue
      await page.goto(episodeUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

      // Extraemos la variable secreta directamente desde el navegador real
      const videos = await page.evaluate(() => {
        return typeof videos !== 'undefined' ? videos : null;
      });

      if (!videos) {
        await browser.close();
        return sock.sendMessage(remoteJid, { text: '❌ AnimeFLV bloqueó la conexión o el capítulo aún no existe.' }, { quoted: msg });
      }

      // Buscamos los servidores vulnerables
      const allServers = [...(videos.SUB || []), ...(videos.LAT || [])];
      const mp4Server = allServers.find(s => s.server === 'mp4upload');
      const yuServer = allServers.find(s => s.server === 'yourupload');

      let finalMp4Url = null;

      // Usamos el navegador para entrar directamente al servidor de video y robar el MP4
      if (mp4Server) {
        let embedUrl = mp4Server.code || mp4Server.url;
        if (embedUrl.startsWith('//')) embedUrl = 'https:' + embedUrl;
        
        await page.goto(embedUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        finalMp4Url = await page.evaluate(() => {
          const script = Array.from(document.querySelectorAll('script')).find(s => s.innerHTML.includes('src:"'));
          if (script) {
             const match = script.innerHTML.match(/src:\s*"([^"]+\.mp4)"/);
             return match ? match[1] : null;
          }
          return null;
        });
      } 
      
      if (!finalMp4Url && yuServer) {
        let embedUrl = yuServer.code || yuServer.url;
        if (embedUrl.startsWith('//')) embedUrl = 'https:' + embedUrl;
        
        await page.goto(embedUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        finalMp4Url = await page.evaluate(() => {
          const meta = document.querySelector('meta[property="og:video"]');
          return meta ? meta.content : null;
        });
      }

      await browser.close(); // Cerramos el navegador para liberar RAM

      if (!finalMp4Url) {
        return sock.sendMessage(remoteJid, { text: `⚠️ *Seguridad Extrema:* Los servidores de video escondieron el MP4.\nÁbrelo manualmente en tu navegador:\n${episodeUrl}` }, { quoted: msg });
      }

      cooldowns.set(sender, Date.now());

      await sock.sendMessage(remoteJid, {
        document: { url: finalMp4Url },
        mimetype: 'video/mp4',
        fileName: `${slug}-Ep${capitulo}.mp4`,
        caption: `✅ *HACKEO Y EXTRACCIÓN EXITOSA*\n\n🎬 *Código:* ${slug}\n🔢 *Capítulo:* ${capitulo}\n👤 *Pedido por:* @${sender.split('@')[0]}`,
        mentions: [sender]
      }, { quoted: msg });

    } catch (e) {
      if (browser) await browser.close();
      console.log('❌ Error crítico en scraping de anime:', e.message);
      await sock.sendMessage(remoteJid, { text: '❌ Ocurrió un error al usar el Navegador Fantasma.' }, { quoted: msg });
    }
  }
};
