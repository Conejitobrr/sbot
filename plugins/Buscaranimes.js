'use strict';

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

module.exports = {
  commands: ['buscaranime', 'animes'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg } = ctx;

    if (args.length === 0) return sock.sendMessage(remoteJid, { text: '❌ Escribe el nombre del anime.' }, { quoted: msg });

    const query = args.join(' ');
    await sock.sendMessage(remoteJid, { text: `🔍 Buscando directamente en Google: "${query}"...` }, { quoted: msg });

    try {
      const browser = await puppeteer.launch({
        executablePath: '/usr/bin/chromium-browser',
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      // Buscamos directamente en Google usando el mismo motor de tu google.js
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent('site:facebook.com/watch ' + query)}`;
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });

      // Extraemos el primer resultado directamente
      const resultado = await page.evaluate(() => {
        const h3 = document.querySelector('h3'); // Título
        const a = h3 ? h3.parentElement : null; // Enlace
        return a ? { title: h3.innerText, href: a.href } : null;
      });

      await browser.close();

      if (!resultado) {
        return sock.sendMessage(remoteJid, { text: '❌ No encontré videos públicos en Facebook.' }, { quoted: msg });
      }

      const respuesta = `✅ *Resultado encontrado en Facebook:*\n\n🎬 *Título:* ${resultado.title}\n🔗 ${resultado.href}\n\n📥 *.descargar ${resultado.href}*`;
      await sock.sendMessage(remoteJid, { text: respuesta }, { quoted: msg });

    } catch (e) {
      await sock.sendMessage(remoteJid, { text: '❌ Error al conectar con Google.' }, { quoted: msg });
    }
  }
};
