'use strict';

const axios = require('axios');

module.exports = {
  commands: ['letra', 'lyrics'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg } = ctx;

    if (!args.length) {
      return sock.sendMessage(
        remoteJid, 
        { text: '❌ *Uso correcto:* .letra [nombre de la canción]\n*Ejemplo:* .letra La leyenda del hada y el mago' }, 
        { quoted: msg }
      );
    }

    const song = args.join(' ');
    await sock.sendMessage(remoteJid, { text: `🔍 Buscando la letra de: *${song}*...` }, { quoted: msg });

    try {
      // Usamos la API pública de Popcat
      const url = `https://api.popcat.xyz/lyrics?song=${encodeURIComponent(song)}`;
      const response = await axios.get(url);

      if (response.data.error) {
        return sock.sendMessage(remoteJid, { text: '❌ No pude encontrar la letra de esa canción.' }, { quoted: msg });
      }

      const { title, artist, image, lyrics } = response.data;

      const textoFinal = `🎤 *${title}*\n👤 *Artista:* ${artist}\n\n${lyrics}`;

      // Enviamos la foto del artista junto con la letra
      await sock.sendMessage(
        remoteJid, 
        { 
          image: { url: image }, 
          caption: textoFinal 
        }, 
        { quoted: msg }
      );

    } catch (error) {
      console.error("Error en plugin de letra:", error.message);
      await sock.sendMessage(remoteJid, { text: '❌ Ocurrió un error al buscar la canción.' }, { quoted: msg });
    }
  }
};
