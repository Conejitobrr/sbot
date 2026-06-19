'use strict';

const axios = require('axios');
const cheerio = require('cheerio');

// Memoria para guardar las búsquedas de cada grupo
const busquedasActivas = new Map();

// Función rápida para raspar imágenes de Bing sin abrir navegadores
async function buscarImagenes(query) {
  try {
    const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}`;
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const $ = cheerio.load(data);
    const resultados = [];

    // Bing guarda los links directos dentro de un atributo llamado "m"
    $('.iusc').each((i, el) => {
      const m = $(el).attr('m');
      if (m) {
        try {
          const jsonData = JSON.parse(m);
          if (jsonData.murl) {
            resultados.push(jsonData.murl); // murl = URL directa de la imagen
          }
        } catch (e) {}
      }
    });

    return resultados;
  } catch (error) {
    return [];
  }
}

module.exports = {
  commands: ['imagen', 'img', 'siguiente'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg, sender, command } = ctx;

    // ==========================================
    // ⏩ COMANDO: .siguiente
    // ==========================================
    if (command === 'siguiente') {
      if (!busquedasActivas.has(remoteJid)) {
        return sock.sendMessage(remoteJid, { 
          text: '❌ No hay ninguna búsqueda activa. Usa *.imagen [texto]* primero.' 
        }, { quoted: msg });
      }

      const sesion = busquedasActivas.get(remoteJid);
      sesion.currentIndex++; 

      if (sesion.currentIndex >= sesion.images.length) {
        busquedasActivas.delete(remoteJid);
        return sock.sendMessage(remoteJid, { 
          text: '⚠️ Ya vimos todas las imágenes disponibles. Busca otra cosa.' 
        }, { quoted: msg });
      }

      const imageUrl = sesion.images[sesion.currentIndex];

      try {
        return await sock.sendMessage(remoteJid, {
          image: { url: imageUrl },
          caption: `📸 *Resultado ${sesion.currentIndex + 1} de ${sesion.images.length}*\n🔍 *Búsqueda:* ${sesion.query}\n\n💡 _Usa *.siguiente* para ver otra._`
        }, { quoted: msg });
      } catch (err) {
        return sock.sendMessage(remoteJid, { 
          text: `⚠️ La imagen #${sesion.currentIndex + 1} está protegida o borrada de su servidor.\n\nEscribe *.siguiente* de nuevo para saltarla.` 
        }, { quoted: msg });
      }
    }

    // ==========================================
    // 🔍 COMANDO PRINCIPAL: .imagen
    // ==========================================
    if (command === 'imagen' || command === 'img') {
      if (!args.length) {
        return sock.sendMessage(remoteJid, { 
          text: '❌ Dime qué imagen buscar.\n\nEjemplo:\n.imagen Rata Blanca banda' 
        }, { quoted: msg });
      }

      const query = args.join(' ');

      await sock.sendMessage(remoteJid, { 
        text: `🔍 *Buscando:* ${query}...` 
      }, { quoted: msg });

      // Ejecutamos la búsqueda en Bing
      const results = await buscarImagenes(query);

      if (!results || results.length === 0) {
        return sock.sendMessage(remoteJid, { 
          text: '❌ No se encontró ninguna imagen o hubo un error de conexión.' 
        }, { quoted: msg });
      }

      // Guardamos la lista en la memoria
      busquedasActivas.set(remoteJid, {
        query: query,
        images: results,
        currentIndex: 0
      });

      const imageUrl = results[0];

      try {
        await sock.sendMessage(remoteJid, {
          image: { url: imageUrl },
          caption: `📸 *Resultado 1 de ${results.length}*\n🔍 *Búsqueda:* ${query}\n👤 *Pedido por:* @${sender.split('@')[0]}\n\n💡 _Escribe *.siguiente* para ver otra opción._`,
          mentions: [sender]
        }, { quoted: msg });
      } catch (err) {
        await sock.sendMessage(remoteJid, { 
          text: '⚠️ La primera imagen está protegida por derechos de autor.\n\nEscribe *.siguiente* para cargar la número 2.' 
        }, { quoted: msg });
      }
    }
  }
};
