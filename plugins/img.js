'use strict';

const axios = require('axios');

function cleanQuery(q = '') {
  return q.trim().replace(/\s+/g, ' ');
}

// ===============================
// 🔎 DUCKDUCKGO IMAGES
// ===============================
async function ddgSearch(query) {
  const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`;

  const html = await axios.get(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
    }
  });

  const vqd = html.data.match(/vqd=([\d-]+)/i);
  if (!vqd) throw new Error('No vqd');

  const res = await axios.get(
    `https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&vqd=${vqd[1]}&o=json&f=,,,&p=1`,
    {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Referer': 'https://duckduckgo.com/'
      }
    }
  );

  return res.data.results || [];
}

// ===============================
// 🌄 UNSPLASH FALLBACK
// ===============================
async function unsplash(query) {
  const url = `https://source.unsplash.com/600x600/?${encodeURIComponent(query)}`;
  return [url];
}

// ===============================
// 📥 DESCARGAR IMAGEN
// ===============================
async function download(url) {
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 15000,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
    }
  });

  return Buffer.from(res.data);
}

// ===============================
// 🚀 PLUGIN
// ===============================
module.exports = {
  commands: ['img', 'image', 'imagen'],

  execute: async (ctx) => {
    const { sock, remoteJid, args, msg } = ctx;

    const query = cleanQuery(args.join(' '));

    if (!query) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Usa: .img <búsqueda>'
      }, { quoted: msg });
    }

    await sock.sendMessage(remoteJid, {
      text: `🔎 Buscando imágenes de: *${query}*`
    }, { quoted: msg });

    let results = [];

    try {
      const ddg = await ddgSearch(query);

      results = ddg
        .map(r => r.image)
        .filter(Boolean)
        .slice(0, 5);

    } catch (e) {
      console.log('DDG error:', e.message);

      results = await unsplash(query);
    }

    if (!results.length) {
      return sock.sendMessage(remoteJid, {
        text: '❌ No se encontraron imágenes'
      }, { quoted: msg });
    }

    // ===============================
    // 📤 ENVIAR HASTA 5 IMÁGENES
    // ===============================
    for (let i = 0; i < Math.min(results.length, 5); i++) {
      try {
        const buffer = await download(results[i]);

        await sock.sendMessage(remoteJid, {
          image: buffer,
          caption: `🖼️ ${query} (${i + 1}/${results.length})`
        }, { quoted: msg });

      } catch (err) {
        console.log('IMG send error:', err.message);
      }
    }
  }
};
