'use strict';

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

// Memoria temporal global para guardar los links del usuario
global.menuBusqueda = global.menuBusqueda || new Map();

module.exports = {
  commands: ['buscarfb', 'fbbuscar'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg, sender } = ctx;

    if (!args.length) return sock.sendMessage(remoteJid, { text: '❌ Escribe qué video buscas.' }, { quoted: msg });

    const query = args.join(' ');
    await sock.sendMessage(remoteJid, { text: `🔍 Buscando en Facebook Watch: "${query}"...` }, { quoted: msg });

    try {
      const browser = await puppeteer.launch({
        executablePath: '/usr/bin/chromium-browser',
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.goto(`https://www.facebook.com/watch/search/?q=${encodeURIComponent(query)}`, { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 4000));

      const resultados = await page.evaluate(() => {
        const links = [];
        const anchors = document.querySelectorAll('a[href*="/watch/"]');
        anchors.forEach(a => {
          if (a.href && !links.includes(a.href) && links.length < 5) links.push(a.href);
        });
        return links;
      });

      await browser.close();

      if (resultados.length === 0) return sock.sendMessage(remoteJid, { text: '❌ No encontré videos.' }, { quoted: msg });

      // Guardamos los links en la memoria del bot vinculados al usuario
      global.menuBusqueda.set(sender, resultados);

      let msgRes = `✅ *Resultados encontrados. Responde con el número (1-5) para descargar:*\n\n`;
      resultados.forEach((link, i) => {
        msgRes += `*${i + 1}.* ${link}\n`;
      });

      await sock.sendMessage(remoteJid, { text: msgRes }, { quoted: msg });

    } catch (e) {
      await sock.sendMessage(remoteJid, { text: '❌ Error.' }, { quoted: msg });
    }
  }
};
