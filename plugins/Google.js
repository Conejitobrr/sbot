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
        text: '🔍 *Hackeando la seguridad de Google...* simulando ser humano.'
      }, { quoted: msg });

      processingChats.add(remoteJid);

      const browser = await puppeteer.launch({
        executablePath: '/usr/bin/chromium-browser',
        headless: 'new',
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
          '--start-maximized'
        ],
        ignoreDefaultArgs: ['--enable-automation']
      });

      const page = await browser.newPage();

      // Fingimos ser una computadora con Windows 10 e idioma en Español
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
      });
      await page.setViewport({ width: 1280, height: 800 });

      // Inyectamos la cookie para saltar el aviso legal de Google
      const cookies = [{
        name: 'SOCS',
        value: 'CAESHAgBEhJnd3NfMjAyMzA4MTAtMF9SQzIaAmVzIAEaBgiA_LyaBg',
        domain: '.google.com'
      }];
      await page.setCookie(...cookies);

      // 1. VAMOS A LA PÁGINA PRINCIPAL PRIMERO (Como un humano)
      await page.goto('https://www.google.com/?hl=es-419', { waitUntil: 'networkidle2' });

      // 2. SIMULAMOS ESCRIBIR LETRA POR LETRA
      await page.waitForSelector('[name="q"]', { timeout: 5000 });
      // "delay: 60" hace que el bot tarde 60 milisegundos entre cada letra que escribe
      await page.type('[name="q"]', query, { delay: 60 }); 

      // 3. PRESIONAMOS ENTER Y ESPERAMOS
      await Promise.all([
        page.keyboard.press('Enter'),
        page.waitForNavigation({ waitUntil: 'networkidle2' })
      ]);

      // Le damos 2 segundos extras para que carguen bien las imágenes de los resultados
      await new Promise(resolve => setTimeout(resolve, 2000));

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
        text: '❌ Google se puso muy terco y bloqueó el acceso. Intenta con otra búsqueda.'
      }, { quoted: msg });

    } finally {
      processingChats.delete(remoteJid);
    }
  }
};
