'use strict';

const puppeteer = require('puppeteer');

// Candado para evitar que el servidor colapse si piden muchas capturas a la vez
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
          text: '⏳ Aguanta, ya estoy buscando algo para este grupo. Deja que termine.'
        }, { quoted: msg });
      }

      const query = args.join(' ');

      await sock.sendMessage(remoteJid, {
        text: '🔍 *Abriendo Google...* tomando captura.'
      }, { quoted: msg });

      processingChats.add(remoteJid);

      // Iniciar el navegador invisible
      const browser = await puppeteer.launch({
        executablePath: '/usr/bin/chromium-browser', // Usa el Chrome ligero de Ubuntu
        headless: 'new',
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
        ]
      });

      const page = await browser.newPage();

      // Ajustar el tamaño de la "pantalla" (como si fuera un monitor de PC)
      await page.setViewport({ width: 1280, height: 800 });

      // TRUCO PRO: Inyectar cookie para evitar el cartel de "Aceptar Cookies" de Google
      const cookies = [{
        name: 'SOCS',
        value: 'CAESHAgBEhJnd3NfMjAyMzA4MTAtMF9SQzIaAmVzIAEaBgiA_LyaBg',
        domain: '.google.com'
      }];
      await page.setCookie(...cookies);

      // Ir a Google con la búsqueda (hl=es-419 lo pone en español latino)
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=es-419`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });

      // Tomar la captura de la página
      const screenshotBuffer = await page.screenshot({ 
        type: 'jpeg', 
        quality: 80, // Calidad alta pero no tan pesada
        fullPage: false // Solo toma lo que se ve en la pantalla, el primer resultado
      });

      await browser.close();

      // Enviar la captura al grupo
      await sock.sendMessage(remoteJid, {
        image: screenshotBuffer,
        caption: `🔍 *Búsqueda:* ${query}\n👤 *Pedido por:* @${sender.split('@')[0]}`,
        mentions: [sender]
      }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error en google.js:', err?.message || err);

      await sock.sendMessage(remoteJid, {
        text: '❌ Hubo un error al tomar la captura de Google. Inténtalo de nuevo.'
      }, { quoted: msg });

    } finally {
      // Quitar el candado siempre, pase lo que pase
      processingChats.delete(remoteJid);
    }
  }
};
