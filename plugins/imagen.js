'use strict';

const gis = require('g-i-s');

// Memoria para guardar las búsquedas de cada grupo
const busquedasActivas = new Map();

module.exports = {
  // Ahora el archivo responde a dos comandos distintos
  commands: ['imagen', 'img', 'siguiente'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg, sender, command } = ctx;

    // ==========================================
    // ⏩ COMANDO: .siguiente
    // ==========================================
    if (command === 'siguiente') {
      if (!busquedasActivas.has(remoteJid)) {
        return sock.sendMessage(remoteJid, { 
          text: '❌ No hay ninguna búsqueda de imagen activa en este grupo. Usa *.imagen [texto]* primero.' 
        }, { quoted: msg });
      }

      const sesion = busquedasActivas.get(remoteJid);
      sesion.currentIndex++; // Avanzamos a la siguiente foto

      // Si ya nos pasamos del límite de imágenes que encontró Google
      if (sesion.currentIndex >= sesion.images.length) {
        busquedasActivas.delete(remoteJid);
        return sock.sendMessage(remoteJid, { 
          text: '⚠️ Ya vimos todas las imágenes que encontró Google. Intenta buscar otra cosa.' 
        }, { quoted: msg });
      }

      const imageUrl = sesion.images[sesion.currentIndex].url;

      try {
        return await sock.sendMessage(remoteJid, {
          image: { url: imageUrl },
          caption: `📸 *Resultado ${sesion.currentIndex + 1} de ${sesion.images.length}*\n🔍 *Búsqueda:* ${sesion.query}\n\n💡 _Usa *.siguiente* para ver otra._`
        }, { quoted: msg });
      } catch (err) {
        // Si el enlace de la imagen está roto o protegido por el creador, lo avisamos
        return sock.sendMessage(remoteJid, { 
          text: `⚠️ La imagen #${sesion.currentIndex + 1} está protegida por derechos o el link está roto.\n\nEscribe *.siguiente* de nuevo para saltarla.` 
        }, { quoted: msg });
      }
    }

    // ==========================================
    // 🔍 COMANDO PRINCIPAL: .imagen
    // ==========================================
    if (command === 'imagen' || command === 'img') {
      if (!args.length) {
        return sock.sendMessage(remoteJid, { 
          text: '❌ Dime qué imagen buscar.\n\nEjemplo:\n.imagen Stranger Things Upside Down' 
        }, { quoted: msg });
      }

      const query = args.join(' ');

      await sock.sendMessage(remoteJid, { 
        text: `🔍 *Buscando imágenes de:* ${query}...` 
      }, { quoted: msg });

      // Ejecutamos la búsqueda fantasma en Google
      gis(query, async (error, results) => {
        if (error || !results || results.length === 0) {
          return sock.sendMessage(remoteJid, { 
            text: '❌ Google no encontró nada o bloqueó la conexión. Intenta con otras palabras.' 
          }, { quoted: msg });
        }

        // Guardamos todos los resultados en la memoria del grupo
        busquedasActivas.set(remoteJid, {
          query: query,
          images: results, // Google suele devolver hasta 100 imágenes aquí
          currentIndex: 0
        });

        const imageUrl = results[0].url;

        try {
          await sock.sendMessage(remoteJid, {
            image: { url: imageUrl },
            caption: `📸 *Resultado 1 de ${results.length}*\n🔍 *Búsqueda:* ${query}\n👤 *Pedido por:* @${sender.split('@')[0]}\n\n💡 _Escribe *.siguiente* para ver otra opción._`,
            mentions: [sender]
          }, { quoted: msg });
        } catch (err) {
          console.log('❌ Error enviando la primera imagen:', err);
          await sock.sendMessage(remoteJid, { 
            text: '⚠️ La primera imagen tiene un formato inválido o está protegida.\n\nEscribe *.siguiente* para cargar la número 2.' 
          }, { quoted: msg });
        }
      });
    }
  }
};
