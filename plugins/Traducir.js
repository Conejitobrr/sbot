'use strict';

const axios = require('axios');

module.exports = {
  commands: ['tr', 'traducir'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg } = ctx;

    // 1. Verificamos que escriban el comando correctamente
    if (!args || args.length < 2) {
      return sock.sendMessage(
        remoteJid, 
        { 
          text: '❌ *Uso correcto:* .tr [idioma] [texto]\n\n*Ejemplos:*\n.tr en pantalla\n.tr es instead of\n\n*Idiomas comunes:* en (inglés), es (español), pt (portugués), fr (francés).' 
        }, 
        { quoted: msg }
      );
    }

    // 2. Extraemos el idioma destino y el texto a traducir
    const targetLang = args[0].toLowerCase();
    const textToTranslate = args.slice(1).join(' ');

    try {
      // 3. Consultamos la API pública de Google Translate
      // Usamos client=gtx que es el acceso libre de Google
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(textToTranslate)}`;
      
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      // 4. Extraemos la traducción del formato extraño que devuelve Google
      // La respuesta es un array de arrays, concatenamos todas las partes traducidas
      let translatedText = '';
      if (response.data && response.data[0]) {
        response.data[0].forEach(part => {
          if (part[0]) translatedText += part[0];
        });
      }

      // 5. Detectamos qué idioma reconoció automáticamente Google como origen
      const sourceLang = response.data[2] || 'auto';

      // 6. Armamos el mensaje final
      const mensajeFinal = `🌍 *Traducción (${sourceLang.toUpperCase()} ➔ ${targetLang.toUpperCase()})*\n\n${translatedText}`;

      // 7. Enviamos el resultado
      await sock.sendMessage(remoteJid, { text: mensajeFinal }, { quoted: msg });

    } catch (error) {
      console.error("Error en Traductor:", error.message);
      await sock.sendMessage(
        remoteJid, 
        { text: '❌ Hubo un error al intentar traducir. Verifica que el código del idioma sea correcto (ej. "en" para inglés).' }, 
        { quoted: msg }
      );
    }
  }
};
