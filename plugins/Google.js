'use strict';

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const processingChats = new Set();

module.exports = {
  commands: ['google', 'buscar'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg, sender } = ctx;

    try {
      if (!args.length) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Dime qué quieres buscar.\n\nEjemplo:\n.google quién es el presidente de Perú'
        }, { quoted: msg });
      }

      if (processingChats.has(remoteJid)) {
        return sock.sendMessage(remoteJid, {
          text: '⏳ Aguanta, estoy procesando otra captura para el grupo.'
        }, { quoted: msg });
      }

      const query = args.join(' ');

      await sock.sendMessage(remoteJid, {
        text: '🔍 *Buscando información...* esperando a la IA y tomando captura.'
      }, { quoted: msg });

      processingChats.add(remoteJid);

      const browser = await puppeteer.launch({
        executablePath: '/usr/bin/chromium-browser',
        headless: 'new',
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
        ]
      });

      const page = await browser.newPage();
      
      // Tamaño de pantalla de PC
      await page.setViewport({ width: 1280, height: 800 });

      // Usamos el tema oscuro que tenías antes (kae=d) y en español
      const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&kl=es-es&kae=d`;
      
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });

      // 🔥 TRUCO 1: Borramos los anuncios usando CSS directo (No rompe la página)
      await page.addStyleTag({
        content: `
          [data-testid="ads"], 
          .js-ads-wrap, 
          .module--ad { 
            display: none !important; 
          }
        `
      });

      // 🔥 TRUCO 2: Borrado Quirúrgico del cartel de "Upgrade"
      await page.evaluate(() => {
        // Buscamos solo textos específicos
        const textos = document.querySelectorAll('h1, h2, h3, p, span, strong');
        for (let t of textos) {
          if (t.textContent.includes('Upgrade to our browser') || t.textContent.includes('Try the DuckDuckGo Browser')) {
            // Buscamos la caja pequeña que lo contiene y la ocultamos, sin borrar todo el sitio
            let padre = t.parentElement;
            while (padre && padre.tagName !== 'BODY') {
              if (padre.clientWidth < 600 || padre.style.position === 'fixed') {
                padre.style.display = 'none';
                break;
              }
              padre = padre.parentElement;
            }
          }
        }
      });

      // ⏳ TRUCO 3: Le damos 5 segundos exactos para que la Inteligencia artificial termine de escribir en pantalla
      await new Promise(resolve => setTimeout(resolve, 5000));

      const screenshotBuffer = await page.screenshot({ 
        type: 'jpeg', 
        quality: 80, 
        fullPage: false 
      });

      await browser.close();

      await sock.sendMessage(remoteJid, {
        image: screenshotBuffer,
        caption: `🔍 *Búsqueda:* ${query}\n👤 *Pedido por:* @${sender.split('@')[0]}`,
        mentions: [sender]
      }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error en google.js:', err?.message || err);

      await sock.sendMessage(remoteJid, {
        text: '❌ Hubo un error al tomar la captura. Inténtalo de nuevo.'
      }, { quoted: msg });

    } finally {
      processingChats.delete(remoteJid);
    }
  }
};
