'use strict';

const axios = require('axios');

module.exports = {
  commands: ['tr', 'traducir'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg } = ctx;

    if (!args || args.length < 2) {
      return sock.sendMessage(
        remoteJid, 
        { text: '❌ Uso: .tr [idioma] [texto]\nEjemplo: .tr es hello' }, 
        { quoted: msg }
      );
    }

    const targetLang = args[0].toLowerCase();
    const textToTranslate = args.slice(1).join(' ');

    try {
      // Usamos el endpoint oficial de Google Translate (GTX)
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(textToTranslate)}`;
      
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      // --- DEBUG: ESTO APARECERÁ EN TU CONSOLA ---
      console.log("--- RESPUESTA TRADUCTOR ---");
      console.log(JSON.stringify(response.data, null, 2));
      // -------------------------------------------

      // Procesamiento más robusto
      if (!response.data || !response.data[0]) {
        throw new Error("Respuesta vacía de Google");
      }

      const translatedText = response.data[0]
        .map(segment => segment[0])
        .join('');

      const sourceLang = response.data[2] || 'auto';

      const finalMsg = `🌍 *Traducción (${sourceLang.toUpperCase()} ➔ ${targetLang.toUpperCase()})*\n\n${translatedText}`;
      
      await sock.sendMessage(remoteJid, { text: finalMsg }, { quoted: msg });

    } catch (error) {
      console.error("Error Traductor:", error.message);
      await sock.sendMessage(remoteJid, { text: `❌ Error: ${error.message}` }, { quoted: msg });
    }
  }
};
