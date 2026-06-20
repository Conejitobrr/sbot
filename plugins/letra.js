'use strict';

const { Client } = require("genius-lyrics");
// Inicializamos el cliente (no requiere API key para lo que necesitamos)
const genius = new Client();

module.exports = {
  commands: ['letra', 'lyrics'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg } = ctx;

    if (!args.length) {
      return sock.sendMessage(
        remoteJid, 
        { text: '❌ *Uso correcto:* .letra [nombre de la canción]' }, 
        { quoted: msg }
      );
    }

    const query = args.join(' ');
    await sock.sendMessage(remoteJid, { text: `🔍 Buscando en Genius: *${query}*...` }, { quoted: msg });

    try {
      // 1. Buscamos la canción en la base de datos masiva
      const searches = await genius.songs.search(query);
      
      if (!searches || searches.length === 0) {
        return sock.sendMessage(remoteJid, { text: '❌ No pude encontrar esa canción en los registros de Genius.' }, { quoted: msg });
      }

      // 2. Tomamos el resultado más exacto (el primero)
      const mejorResultado = searches[0];
      
      // 3. Extraemos la letra completa
      const lyrics = await mejorResultado.lyrics();
      
      if (!lyrics) {
        return sock.sendMessage(remoteJid, { text: '❌ Encontré la canción, pero la letra aún no ha sido transcrita.' }, { quoted: msg });
      }

      // 4. Armamos el mensaje con los datos oficiales
      const textoFinal = `🎤 *${mejorResultado.title}*\n👤 *Artista:* ${mejorResultado.artist.name}\n\n${lyrics}`;

      // 5. Enviamos la imagen del álbum + la letra en la descripción
      await sock.sendMessage(
        remoteJid, 
        { 
          image: { url: mejorResultado.image }, 
          caption: textoFinal 
        }, 
        { quoted: msg }
      );

    } catch (error) {
      console.error("Error en plugin de Genius:", error.message);
      await sock.sendMessage(remoteJid, { text: '❌ Ocurrió un error al intentar extraer la letra.' }, { quoted: msg });
    }
  }
};
