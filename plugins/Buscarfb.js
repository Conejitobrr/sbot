'use strict';

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

global.menuBusqueda = global.menuBusqueda || new Map();

module.exports = {
  commands: ['buscarfb', 'fbbuscar'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg, sender } = ctx;

    // Lógica para mostrar siguientes resultados
    if (args[0] === 'siguiente') {
      const resultados = global.menuBusqueda.get(sender);
      if (!resultados || resultados.length <= 5) return sock.sendMessage(remoteJid, { text: '❌ No hay más resultados.' }, { quoted: msg });
      
      let msgRes = `✅ *Resultados 6-10 (Responde 6-10 para descargar):*\n\n`;
      resultados.slice(5, 10).forEach((item, i) => {
        msgRes += `*${i + 6}.* ${item.title}\n`;
      });
      return sock.sendMessage(remoteJid, { text: msgRes }, { quoted: msg });
    }

    if (!args.length) return sock.sendMessage(remoteJid, { text: '❌ ¿Qué anime o video buscas?' }, { quoted: msg });

    const query = args.join(' ');
    await sock.sendMessage(remoteJid, { text: `🔍 Buscando desde Perú: "${query}"...` }, { quoted: msg });

    try {
      const browser = await puppeteer.launch({
        executablePath: '/usr/bin/chromium-browser',
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      
      // Ajustes de geolocalización y cookies para Perú
      await page.setExtraHTTPHeaders({ 'Accept-Language': 'es-PE,es;q=0.9' });
      await page.goto('https://www.facebook.com/', { waitUntil: 'networkidle2' });
      await page.evaluate(() => { document.cookie = "locale=es_LA; domain=.facebook.com; path=/"; });

      await page.goto(`https://www.facebook.com/watch/search/?q=${encodeURIComponent(query)}`, { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 6000));

      const resultados = await page.evaluate(() => {
        const items = [];
        // Seleccionamos contenedores de artículos (posts) de video
        const posts = document.querySelectorAll('div[role="article"]');
        
        posts.forEach(post => {
          const linkEl = post.querySelector('a[href*="/watch/"], a[href*="/videos/"]');
          // Buscamos todos los divs con texto y elegimos el que sea más largo (título)
          const textos = Array.from(post.querySelectorAll('div[dir="auto"]'));
          const titleEl = textos.find(el => el.innerText.length > 20) || textos[0];
          
          if (linkEl && titleEl && titleEl.innerText.length > 5) {
            items.push({ 
              title: titleEl.innerText.substring(0, 50).replace(/\n/g, ' '), 
              url: linkEl.href 
            });
          }
        });
        // Filtrar duplicados
        return Array.from(new Set(items.map(a => JSON.stringify(a)))).map(a => JSON.parse(a)).slice(0, 10);
      });

      await browser.close();

      if (resultados.length === 0) return sock.sendMessage(remoteJid, { text: '❌ No encontré resultados. Intenta ser más específico.' }, { quoted: msg });

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
