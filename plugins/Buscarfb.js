'use strict';

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

global.menuBusqueda = global.menuBusqueda || new Map();

module.exports = {
  commands: ['buscarfb', 'fbbuscar'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg, sender } = ctx;

    if (!args.length) return sock.sendMessage(remoteJid, { text: '❌ ¿Qué quieres buscar?' }, { quoted: msg });

    const query = args.join(' ');
    await sock.sendMessage(remoteJid, { text: `🔍 Buscando en Facebook Watch: "${query}"...` }, { quoted: msg });

    try {
      const browser = await puppeteer.launch({
        executablePath: '/usr/bin/chromium-browser',
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      // Usamos el enlace que TÚ mismo probaste y funciona
      await page.goto(`https://www.facebook.com/watch/search/?q=${encodeURIComponent(query)}`, { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 6000)); // Damos más tiempo para cargar

      const resultados = await page.evaluate(() => {
        const items = [];
        // Buscamos enlaces que tengan '?v=' o '/videos/'
        const links = document.querySelectorAll('a[href*="/watch/?v="], a[href*="/videos/"]');
        
        links.forEach(l => {
          // Buscamos un texto cercano que actúe como título
          const title = l.innerText || l.getAttribute('aria-label') || "Video de Facebook";
          if (l.href && !items.find(i => i.url === l.href) && title.length > 5) {
            items.push({ title: title.substring(0, 40), url: l.href });
          }
        });
        return items.slice(0, 5);
      });

      await browser.close();

      if (resultados.length === 0) return sock.sendMessage(remoteJid, { text: '❌ No pude extraer resultados. Intenta otro término.' }, { quoted: msg });

      global.menuBusqueda.set(sender, resultados);

      let msgRes = `✅ *Resultados encontrados (Responde 1-5):*\n\n`;
      resultados.forEach((item, i) => {
        msgRes += `*${i + 1}.* ${item.title}\n`;
      });

      await sock.sendMessage(remoteJid, { text: msgRes }, { quoted: msg });

    } catch (e) {
      await sock.sendMessage(remoteJid, { text: '❌ Error: ' + e.message }, { quoted: msg });
    }
  }
};
