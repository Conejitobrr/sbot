'use strict';

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

module.exports = {
  commands: ['buscaranime', 'animes'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg } = ctx;

    if (args.length === 0) return sock.sendMessage(remoteJid, { text: '❌ Ejemplo: .buscaranime jujutsu kaisen 04' }, { quoted: msg });

    const query = args.join(' ');
    await sock.sendMessage(remoteJid, { text: `🔍 *Abriendo motor de navegación real...* buscando "${query}"...` }, { quoted: msg });

    try {
      const browser = await puppeteer.launch({
        executablePath: '/usr/bin/chromium-browser',
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36');
      
      // Buscamos en Google directamente porque ya sabemos que tu Google.js encuentra resultados ahí
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent('site:facebook.com ' + query)}`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });

      // Extraemos los enlaces usando el navegador real
      const links = await page.evaluate(() => {
        const results = [];
        const anchors = document.querySelectorAll('a');
        for (let a of anchors) {
          const href = a.href;
          if (href && href.includes('facebook.com') && href.includes('video')) {
            results.push(href);
          }
        }
        return results.slice(0, 3); // Primeros 3 resultados
      });

      await browser.close();

      if (links.length === 0) {
        return sock.sendMessage(remoteJid, { text: '❌ Google no pudo encontrar enlaces de video para esa búsqueda.' }, { quoted: msg });
      }

      let respuesta = `✅ *Resultados encontrados con Navegador Real:*\n\n`;
      links.forEach((link, i) => {
        respuesta += `*Opción ${i + 1}:* \n📥 .descargar ${link}\n\n`;
      });

      return sock.sendMessage(remoteJid, { text: respuesta }, { quoted: msg });

    } catch (e) {
      return sock.sendMessage(remoteJid, { text: '❌ Error crítico en el navegador del bot.' }, { quoted: msg });
    }
  }
};
