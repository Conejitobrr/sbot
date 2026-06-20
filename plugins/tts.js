'use strict';

const axios = require('axios');

module.exports = {
  commands: ['tts', 'voz', 'hablar'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg } = ctx;

    if (!args || args.length === 0) {
      return sock.sendMessage(
        remoteJid, 
        { text: '❌ *Uso:* .tts [idioma] [texto]\n\n*Ejemplo:*\n.tts es hola a todos' }, 
        { quoted: msg }
      );
    }

    let lang = 'es';
    let textToSpeak = '';

    if (args[0].length <= 3 && args.length > 1) {
      lang = args[0].toLowerCase();
      textToSpeak = args.slice(1).join(' ');
    } else {
      textToSpeak = args.join(' ');
    }

    if (textToSpeak.length > 200) {
      textToSpeak = textToSpeak.substring(0, 200);
      await sock.sendMessage(remoteJid, { text: '⚠️ El texto es muy largo, leyendo solo los primeros 200 caracteres.' }, { quoted: msg });
    }

    try {
      // Cambiamos a client=gtx que es el mismo que usamos para el traductor (más estable)
      const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(textToSpeak)}&tl=${lang}&client=gtx`;
      
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      const bufferAudio = Buffer.from(response.data, 'binary');

      // Aquí está el arreglo clave:
      await sock.sendMessage(
        remoteJid, 
        { 
          audio: bufferAudio, 
          mimetype: 'audio/mpeg', // Especificamos que es un MP3 real
          ptt: false              // 🔥 Lo apagamos para que WhatsApp no exija formato OGG
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
