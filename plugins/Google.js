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
        text: '🔍 *Buscando información...* limpiando anuncios y tomando captura.'
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
      
      await page.setViewport({ width: 1280, height: 800 });

      // kl=es-es (Español) | kae=c (Tema Claro para que parezca Google)
      const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&kl=es-es&kae=c`;
      
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });

      // 🔥 TRUCO MÁGICO: Inyectar código para destruir la publicidad
      await page.evaluate(() => {
        // 1. Borrar el popup gigante de "Upgrade to our browser"
        const popups = document.querySelectorAll('[class*="badge"], [class*="promo"]');
        popups.forEach(p => p.remove());

        const divs = document.querySelectorAll('div');
        for (let div of divs) {
          if (div.innerText && div.innerText.includes('Upgrade to our browser')) {
            div.remove();
          }
        }

        // 2. Borrar los anuncios patrocinados de arriba (Ads)
        const ads = document.querySelectorAll('.js-ads-wrap, [data-testid="ads"], .module--ad');
        ads.forEach(ad => ad.remove());
      });

      // Le damos 1.5 segundos extras para que la página se acomode tras borrar la basura
      await new Promise(resolve => setTimeout(resolve, 1500));

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
