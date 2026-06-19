'use strict';

const axios = require('axios');
const cheerio = require('cheerio');

// Memoria para guardar las búsquedas de cada grupo
const busquedasActivas = new Map();

// Función rápida para raspar imágenes forzando la región a Perú (es-PE)
async function buscarImagenes(query) {
  try {
    // Le decimos a Bing: Idioma Español (setlang=es), Mercado Perú (es-PE) y País Perú (cc=PE)
    const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&setmkt=es-PE&setlang=es&cc=PE`;
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        // Esto le confirma al servidor que somos de Latinoamérica
        'Accept-Language': 'es-PE,es;q=0.9,en;q=0.8'
      }
    });

    const $ = cheerio.load(data);
    const resultados = [];

    $('.iusc').each((i, el) => {
      const m = $(el).attr('m');
      if (m) {
        try {
          const jsonData = JSON.parse(m);
          if (jsonData.murl) {
            resultados.push(jsonData.murl);
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
          text: '❌ No hay ninguna búsqueda activa o ya caducó. Usa *.imagen [texto]* primero.' 
        }, { quoted: msg });
      }

      const sesion = busquedasActivas.get(remoteJid);
      sesion.currentIndex++; 

      if (sesion.currentIndex >= sesion.images.length) {
        // Limpiamos la RAM si llegamos al final
        clearTimeout(sesion.timer);
        busquedasActivas.delete(remoteJid);
        return sock.sendMessage(remoteJid, { 
          text: '⚠️ Ya vimos todas las imágenes disponibles. Busca otra cosa.' 
        }, { quoted: msg });
      }

      // Reiniciamos el reloj de 5 minutos de inactividad
      clearTimeout(sesion.timer);
      sesion.timer = setTimeout(() => {
        busquedasActivas.delete(remoteJid);
      }, 5 * 60 * 1000);

      const imageUrl = sesion.images[sesion.currentIndex];

      try {
        return await sock.sendMessage(remoteJid, {
          image: { url: imageUrl },
          caption: `📸 *Resultado ${sesion.currentIndex + 1} de ${sesion.images.length}*\n🔍 *Búsqueda:* ${sesion.query}\n\n💡 _Usa *.siguiente* para ver otra._`
        }, { quoted: msg });
      } catch (err) {
        return sock.sendMessage(remoteJid, { 
          text: `⚠️ La imagen #${sesion.currentIndex + 1} está protegida.\n\nEscribe *.siguiente* de nuevo para saltarla.` 
        }, { quoted: msg });
      }
    }

    // ==========================================
    // 🔍 COMANDO PRINCIPAL: .imagen
    // ==========================================
    if (command === 'imagen' || command === 'img') {
      if (!args.length) {
        return sock.sendMessage(remoteJid, { 
          text: '❌ Dime qué imagen buscar.\n\nEjemplo:\n.imagen ceviche mixto' 
        }, { quoted: msg });
      }

      const query = args.join(' ');

      await sock.sendMessage(remoteJid, { 
        text: `🔍 *Buscando:* ${query}...` 
      }, { quoted: msg });

      const results = await buscarImagenes(query);

      if (!results || results.length === 0) {
        return sock.sendMessage(remoteJid, { 
          text: '❌ No se encontró ninguna imagen.' 
        }, { quoted: msg });
      }

      // Si había una búsqueda anterior en este grupo, borramos su temporizador viejo
      if (busquedasActivas.has(remoteJid)) {
        clearTimeout(busquedasActivas.get(remoteJid).timer);
      }

      // Guardamos la lista en la memoria con un reloj de autodestrucción (5 min = 300,000 ms)
      const timerDestruccion = setTimeout(() => {
        busquedasActivas.delete(remoteJid);
      }, 5 * 60 * 1000);

      busquedasActivas.set(remoteJid, {
        query: query,
        images: results,
        currentIndex: 0,
        timer: timerDestruccion // Guardamos el reloj en la sesión
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
          text: '⚠️ La primera imagen está protegida o el link caducó.\n\nEscribe *.siguiente* para cargar la número 2.' 
        }, { quoted: msg });
      }
    }
  }
};
