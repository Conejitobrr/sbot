'use strict';

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const processingChats = new Set();

module.exports = {
  // Mantenemos el comando "google" para que tus usuarios no noten el cambio
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
        text: '🔍 *Buscando información...* tomando captura.'
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

      // Usamos el buscador antibloqueos. 
      // kl=es-es (Idioma Español) | kae=d (Tema Claro para que parezca Google)
      const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&kl=es-es&kae=d`;
      
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });

      // Le damos 2 segundos para que cargue la información y las imágenes
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
        text: '❌ Hubo un error al tomar la captura. Inténtalo de nuevo.'
      }, { quoted: msg });

    } finally {
      processingChats.delete(remoteJid);
    }
  }
};
