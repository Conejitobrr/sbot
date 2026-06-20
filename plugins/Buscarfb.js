'use strict';

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

module.exports = {
  commands: ['buscarfb', 'fbbuscar'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg } = ctx;

    if (!args.length) return sock.sendMessage(remoteJid, { text: '❌ Escribe qué video buscas en Facebook.\nEjemplo: .buscarfb jujutsu kaisen 04' }, { quoted: msg });

    const query = args.join(' ');
    await sock.sendMessage(remoteJid, { text: `🔍 Buscando en Facebook: "${query}"...` }, { quoted: msg });

    try {
      const browser = await puppeteer.launch({
        executablePath: '/usr/bin/chromium-browser',
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      // Buscamos directo en Facebook Watch
      await page.goto(`https://www.facebook.com/watch/search/?q=${encodeURIComponent(query)}`, { waitUntil: 'networkidle2' });

      // Esperamos a que carguen los resultados
      await new Promise(r => setTimeout(r, 5000));

      const resultados = await page.evaluate(() => {
        const links = [];
        // Seleccionamos los enlaces de videos que aparecen en los resultados
        const anchors = document.querySelectorAll('a[href*="/watch/"]');
        anchors.forEach(a => {
          if (a.href && !links.includes(a.href)) links.push(a.href);
        });
        return links.slice(0, 3);
      });

      await browser.close();

      if (resultados.length === 0) return sock.sendMessage(remoteJid, { text: '❌ No encontré videos. Asegúrate de que el término no sea muy largo.' }, { quoted: msg });

      let msgRes = `✅ *Resultados en Facebook Watch:*\n\n`;
      resultados.forEach((link, i) => {
        msgRes += `*${i + 1}.* ${link}\n📥 *.descargar ${link}*\n\n`;
      });

      await sock.sendMessage(remoteJid, { text: msgRes }, { quoted: msg });

    } catch (e) {
      await sock.sendMessage(remoteJid, { text: '❌ Error al buscar en Facebook.' }, { quoted: msg });
    }
  }
};
