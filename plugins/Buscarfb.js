'use strict';

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

global.menuBusqueda = global.menuBusqueda || new Map();

module.exports = {
  commands: ['buscarfb', 'fbbuscar'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg, sender } = ctx;

    if (args[0] === 'siguiente') {
      const resultados = global.menuBusqueda.get(sender);
      if (!resultados || resultados.length <= 5) return sock.sendMessage(remoteJid, { text: '❌ No hay más resultados.' }, { quoted: msg });
      
      let msgRes = `✅ *Resultados 6-10 (Responde 6-10 para descargar):*\n\n`;
      resultados.slice(5, 10).forEach((item, i) => {
        msgRes += `*${i + 6}.* ${item.title}\n`;
      });
      return sock.sendMessage(remoteJid, { text: msgRes }, { quoted: msg });
    }

    if (!args.length) return sock.sendMessage(remoteJid, { text: '❌ ¿Qué anime buscas?' }, { quoted: msg });

    const query = args.join(' ');
    await sock.sendMessage(remoteJid, { text: `🔍 Buscando desde Perú: "${query}"...` }, { quoted: msg });

    try {
      const browser = await puppeteer.launch({
        executablePath: '/usr/bin/chromium-browser',
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      
      // 🔥 FORZAMOS IDIOMA Y REGIÓN PERUANA
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'es-PE,es;q=0.9'
      });

      // Navegamos primero a Facebook.com para inyectar una cookie de idioma si es necesario
      await page.goto('https://www.facebook.com/', { waitUntil: 'networkidle2' });
      await page.evaluate(() => {
        document.cookie = "locale=es_LA; domain=.facebook.com; path=/";
      });

      // Ahora buscamos
      await page.goto(`https://www.facebook.com/watch/search/?q=${encodeURIComponent(query)}`, { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 6000));

      const resultados = await page.evaluate(() => {
        const items = [];
        const links = document.querySelectorAll('a[href*="/watch/?v="], a[href*="/videos/"]');
        links.forEach(l => {
          const title = l.innerText || l.getAttribute('aria-label') || "Video de Facebook";
          if (l.href && !items.find(i => i.url === l.href) && title.length > 5) {
            items.push({ title: title.substring(0, 40), url: l.href });
          }
        });
        return items.slice(0, 10);
      });

      await browser.close();

      if (resultados.length === 0) return sock.sendMessage(remoteJid, { text: '❌ No encontré resultados. Intenta con un término más general.' }, { quoted: msg });

      global.menuBusqueda.set(sender, resultados);

      let msgRes = `✅ *Resultados 1-5 (Responde 1-5 para descargar):*\n\n`;
      resultados.slice(0, 5).forEach((item, i) => {
        msgRes += `*${i + 1}.* ${item.title}\n`;
      });
      msgRes += `\n⚡ *Escribe .buscarfb siguiente para ver más.*`;
      
      await sock.sendMessage(remoteJid, { text: msgRes }, { quoted: msg });

    } catch (e) {
      await sock.sendMessage(remoteJid, { text: '❌ Error: ' + e.message }, { quoted: msg });
    }
  }
};
