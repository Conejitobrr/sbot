'use strict';

const axios = require('axios');

module.exports = {
  commands: ['tts', 'voz', 'hablar'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg } = ctx;

    // 1. Verificamos que haya escrito algo
    if (!args || args.length === 0) {
      return sock.sendMessage(
        remoteJid, 
        { text: '❌ *Uso:* .tts [idioma] [texto]\n\n*Ejemplos:*\n.tts en hello world\n.tts hola cómo estás' }, 
        { quoted: msg }
      );
    }

    // 2. Lógica inteligente para detectar si puso idioma o no
    let lang = 'es'; // Español por defecto
    let textToSpeak = '';

    // Si la primera palabra es cortita (como 'es', 'en', 'pt') y hay más texto, la tomamos como idioma
    if (args[0].length <= 3 && args.length > 1) {
      lang = args[0].toLowerCase();
      textToSpeak = args.slice(1).join(' ');
    } else {
      // Si no puso idioma, asumimos que es español y leemos todo
      textToSpeak = args.join(' ');
    }

    // El límite de caracteres por URL en Google TTS es de aprox 200. Lo recortamos por seguridad.
    if (textToSpeak.length > 200) {
      textToSpeak = textToSpeak.substring(0, 200);
      await sock.sendMessage(remoteJid, { text: '⚠️ El texto es muy largo, solo leeré los primeros 200 caracteres.' }, { quoted: msg });
    }

    try {
      // 3. Solicitamos el audio directamente a Google
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(textToSpeak)}&tl=${lang}&client=tw-ob`;
      
      const response = await axios.get(url, {
        responseType: 'arraybuffer', // Fundamental para recibir un archivo, no texto
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      // 4. Convertimos la respuesta a un buffer de audio
      const bufferAudio = Buffer.from(response.data, 'binary');

      // 5. Enviamos como Nota de Voz
      await sock.sendMessage(
        remoteJid, 
        { 
          audio: bufferAudio, 
          mimetype: 'audio/mp4', // Baileys usa este mimetype para las notas de voz
          ptt: true              // 🔥 MAGIA: true = Nota de voz | false = Archivo de audio normal
        }, 
        { quoted: msg }
      );

    } catch (error) {
      console.error("Error en TTS:", error.message);
      await sock.sendMessage(
        remoteJid, 
        { text: '❌ Ocurrió un error al generar el audio.' }, 
        { quoted: msg }
      );
    }
  }
};
