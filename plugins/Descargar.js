'use strict';

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = {
  commands: ['descargar'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg, sender } = ctx;

    // 1. Obtener el link
    let url = args[0];
    
    // Si eligió por número (ej: .descargar 1)
    if (args.length === 1 && !isNaN(args[0])) {
      const indice = parseInt(args[0]) - 1;
      const resultados = global.menuBusqueda ? global.menuBusqueda.get(sender) : null;
      if (resultados && resultados[indice]) url = resultados[indice].url;
    }

    if (!url || !url.includes('facebook.com')) {
      return sock.sendMessage(remoteJid, { text: '❌ Enlace inválido.' }, { quoted: msg });
    }

    await sock.sendMessage(remoteJid, { text: '⏳ *Descargando video de Facebook, espera unos segundos...*' }, { quoted: msg });

    const outputPath = path.join(__dirname, `../temp/video_${sender}.mp4`);

    // Ejecutamos yt-dlp para descargar el video
    // Usamos --format "best[ext=mp4]" para asegurar que sea compatible con WhatsApp
    exec(`yt-dlp -f "best[ext=mp4]" "${url}" -o "${outputPath}"`, async (error) => {
      if (error) {
        return sock.sendMessage(remoteJid, { text: '❌ Error al descargar el video. El enlace podría ser privado.' }, { quoted: msg });
      }

      // Enviamos el video
      await sock.sendMessage(remoteJid, {
        document: { url: outputPath },
        mimetype: 'video/mp4',
        fileName: 'Video_FB.mp4',
        caption: '✅ *Aquí tienes tu video.*'
      }, { quoted: msg });

      // Borramos el archivo temporal para no llenar el servidor
      fs.unlinkSync(outputPath);
    });
  }
};
