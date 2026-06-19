'use strict';

// Cargamos la versión "extra" con esteroides y el plugin Stealth
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Activamos el modo sigilo
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
        text: '🔍 *Navegando en modo sigilo...* evadiendo seguridad.'
      }, { quoted: msg });

      processingChats.add(remoteJid);

      const browser = await puppeteer.launch({
        executablePath: '/usr/bin/chromium-browser',
        headless: 'new',
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled', // Evita que Google sepa que es un script
          '--start-maximized'
        ],
        ignoreDefaultArgs: ['--enable-automation'] // Oculta la barra de "Chrome está siendo controlado"
      });

      const page = await browser.newPage();

      // Disfrazamos al bot como un humano usando Google Chrome en Windows 10
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Ajustamos el tamaño a una laptop estándar
      await page.setViewport({ width: 1366, height: 768 });

      // Inyectar cookie para evitar el cartel de "Aceptar Cookies"
      const cookies = [{
        name: 'SOCS',
        value: 'CAESHAgBEhJnd3NfMjAyMzA4MTAtMF9SQzIaAmVzIAEaBgiA_LyaBg',
        domain: '.google.com'
      }];
      await page.setCookie(...cookies);

      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=es-419`;
      
      // Entramos a Google simulando la conexión humana
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });

      // Pequeña pausa natural para que carguen las imágenes
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
        text: '❌ Hubo un error. Puede que Google se haya puesto muy pesado, intenta de nuevo.'
      }, { quoted: msg });

    } finally {
      processingChats.delete(remoteJid);
    }
  }
};
