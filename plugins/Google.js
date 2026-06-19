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
          text: '⏳ Aguanta, el bot está procesando otra búsqueda pesada en este momento.'
        }, { quoted: msg });
      }

      const query = args.join(' ');

      await sock.sendMessage(remoteJid, {
        text: '🤖 *Iniciando asistente IA...* analizando desde Perú y tomando captura.'
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

      // 🔥 TRUCO DE UBICACIÓN: Fingimos ser una PC en Perú
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setExtraHTTPHeaders({
        // Esto fuerza a las páginas y a la IA a usar Español Latino/Peruano
        'Accept-Language': 'es-PE,es-419,es;q=0.9,en;q=0.8'
      });
      
      // Tamaño de pantalla amplio para que el cuadro de IA entre perfectamente
      await page.setViewport({ width: 1366, height: 800 });

      // kl=pe-es (Forzamos la región a Perú) | kae=d (Tema oscuro)
      const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&kl=pe-es&kae=d`;
      
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });

      // 🔥 LIMPIEZA EXTREMA Y AUTO-CLICK EN LA IA
      await page.evaluate(() => {
        // 1. Destruir cualquier rastro de Anuncios (Ads)
        const ads = document.querySelectorAll('[data-testid*="ad"], .js-ads-wrap, .result--ad');
        ads.forEach(ad => ad.remove());

        // 2. Destruir popups flotantes (como la caja blanca de "Free")
        const allDivs = document.querySelectorAll('div');
        for (let div of allDivs) {
          const text = div.innerText || '';
          if (text.includes('Upgrade to our browser') || text === 'Free' || text.includes('Try the DuckDuckGo')) {
            let parent = div;
            // Buscamos el contenedor que flota y lo borramos completo
            while (parent && parent.tagName !== 'BODY') {
              if (window.getComputedStyle(parent).position === 'fixed' || window.getComputedStyle(parent).position === 'absolute') {
                parent.remove();
                break;
              }
              parent = parent.parentElement;
            }
          }
        }

        // 3. AUTO-CLICK en el botón de la Inteligencia Artificial
        const buttons = Array.from(document.querySelectorAll('button'));
        const assistBtn = buttons.find(b => b.innerText && b.innerText.includes('Search Assist'));
        if (assistBtn) {
          assistBtn.click();
        }
      });

      // ⏳ Le damos 8 segundos al bot. 
      // Este tiempo es crucial para que la IA de DuckDuckGo termine de "tipear" su respuesta antes de la foto.
      await new Promise(resolve => setTimeout(resolve, 8000));

      const screenshotBuffer = await page.screenshot({ 
        type: 'jpeg', 
        quality: 85, // Subimos un pelín la calidad para leer mejor a la IA
        fullPage: false 
      });

      await browser.close();

      await sock.sendMessage(remoteJid, {
        image: screenshotBuffer,
        caption: `🔍 *Búsqueda:* ${query}\n🤖 *Asistente IA Activado*\n👤 *Pedido por:* @${sender.split('@')[0]}`,
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
