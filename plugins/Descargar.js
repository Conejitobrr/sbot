'use strict';

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = {
  commands: ['descargar'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg, sender } = ctx;

    let url = args[0];
    if (args.length === 1 && !isNaN(args[0])) {
      const indice = parseInt(args[0]) - 1;
      const resultados = global.menuBusqueda ? global.menuBusqueda.get(sender) : null;
      if (resultados && resultados[indice]) url = resultados[indice].url;
    }

    if (!url || !url.includes('facebook.com')) {
      return sock.sendMessage(remoteJid, { text: '❌ Enlace inválido o fuera de rango.' }, { quoted: msg });
    }

    await sock.sendMessage(remoteJid, { text: '⏳ *Descargando video en 720p, espera...*' }, { quoted: msg });

    const fileName = `video_${Date.now()}.mp4`;
    const outputPath = path.join(__dirname, `../temp/${fileName}`);

    // Calidad 720p forzada
    exec(`yt-dlp -f "bestvideo[height<=720]+bestaudio/best[height<=720]" "${url}" -o "${outputPath}"`, async (error) => {
      if (error) {
        return sock.sendMessage(remoteJid, { text: '❌ Error al descargar. Intenta con otro video.' }, { quoted: msg });
      }

      await sock.sendMessage(remoteJid, {
        document: { url: outputPath },
        mimetype: 'video/mp4',
        fileName: 'Anime_FB.mp4',
        caption: '✅ *Video descargado exitosamente.*'
      }, { quoted: msg });

      fs.unlinkSync(outputPath);
    });
  }
};
