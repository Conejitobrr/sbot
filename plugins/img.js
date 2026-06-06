'use strict';

const axios = require('axios');

function cleanQuery(text = '') {
  return text.trim().replace(/\s+/g, ' ');
}

// 🔥 obtener token vqd de duckduckgo
async function getVqd(query) {
  const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`;

  const res = await axios.get(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
    }
  });

  const match = res.data.match(/vqd=([\d-]+)/i);
  if (!match) throw new Error('No vqd token');

  return match[1];
}

// 🔥 buscar imágenes
async function searchImages(query, vqd) {
  const url = `https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&vqd=${vqd}&o=json&f=,,,&p=1`;

  const res = await axios.get(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      'Referer': 'https://duckduckgo.com/'
    }
  });

  return res.data?.results || [];
}

// 🔥 descargar imagen
async function downloadImage(url) {
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

module.exports = {
  commands: ['img', 'imagen', 'image'],

  execute: async (ctx) => {
    const { sock, remoteJid, args, msg } = ctx;

    const query = cleanQuery(args.join(' '));

    if (!query) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Usa: .img <texto>'
      }, { quoted: msg });
    }

    await sock.sendMessage(remoteJid, {
      text: `🔎 Buscando: *${query}*`
    }, { quoted: msg });

    try {
      const vqd = await getVqd(query);
      const results = await searchImages(query, vqd);

      if (!results.length) {
        return sock.sendMessage(remoteJid, {
          text: '❌ No se encontraron imágenes'
        }, { quoted: msg });
      }

      const imgUrl =
        results.find(r => r.image)?.image ||
        results[0].image ||
        results[0].thumbnail;

      const buffer = await downloadImage(imgUrl);

      return sock.sendMessage(remoteJid, {
        image: buffer,
        caption: `🖼️ Resultado: *${query}*`
      }, { quoted: msg });

    } catch (err) {
      console.log('IMG ERROR:', err?.message || err);

      return sock.sendMessage(remoteJid, {
        text: '❌ Error buscando imagen. Intenta otra palabra.'
      }, { quoted: msg });
    }
  }
};
