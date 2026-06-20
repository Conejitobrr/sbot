'use strict';

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

module.exports = {
  commands: ['tts', 'voz', 'hablar'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg } = ctx;

    if (!args || args.length === 0) {
      return sock.sendMessage(remoteJid, { text: '❌ *Uso:* .tts [texto]\nEl bot detectará el idioma automáticamente.' }, { quoted: msg });
    }

    let textToSpeak = args.join(' ');

    if (textToSpeak.length > 200) {
      textToSpeak = textToSpeak.substring(0, 200);
      await sock.sendMessage(remoteJid, { text: '⚠️ Texto muy largo, leyendo los primeros 200 caracteres.' }, { quoted: msg });
    }

    try {
      // 1. MAGIA DE DETECCIÓN: Le preguntamos a la API qué idioma es
      const detectUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=es&dt=t&q=${encodeURIComponent(textToSpeak)}`;
      const detectResponse = await axios.get(detectUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      
      // Si detecta el idioma lo usamos, si no, caemos por defecto a 'es'
      const detectedLang = (detectResponse.data && detectResponse.data[2]) ? detectResponse.data[2] : 'es';

      // 2. DESCARGAMOS EL MP3 CON EL IDIOMA DETECTADO
      const ttsUrl = `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(textToSpeak)}&tl=${detectedLang}&client=gtx`;
      const audioResponse = await axios.get(ttsUrl, {
        responseType: 'arraybuffer',
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      // 3. CONVERSIÓN A OGG (OPUS) PARA ENGAÑAR A WHATSAPP
      // Creamos rutas temporales seguras en el servidor
      const tempId = Date.now();
      const tempMp3 = path.join('/tmp', `tts_${tempId}.mp3`);
      const tempOgg = path.join('/tmp', `tts_${tempId}.ogg`);

      // Guardamos el MP3
      fs.writeFileSync(tempMp3, Buffer.from(audioResponse.data, 'binary'));

      // Ejecutamos FFmpeg para convertirlo al formato estricto de WhatsApp
      await exec(`ffmpeg -i ${tempMp3} -c:a libopus -b:a 48k -vbr on -compression_level 10 -frame_duration 60 -application voip ${tempOgg}`);

      // Leemos el archivo convertido
      const oggBuffer = fs.readFileSync(tempOgg);

      // 4. ENVIAMOS COMO NOTA DE VOZ (ptt: true)
      await sock.sendMessage(
        remoteJid, 
        { 
          audio: oggBuffer, 
          mimetype: 'audio/ogg; codecs=opus', 
          ptt: true 
        }, 
        { quoted: msg }
      );

      // 5. LIMPIEZA (Destruimos la evidencia para no gastar espacio)
      try {
        fs.unlinkSync(tempMp3);
        fs.unlinkSync(tempOgg);
      } catch (err) {}

    } catch (error) {
      console.error("Error en TTS:", error.message);
      await sock.sendMessage(
        remoteJid, 
        { text: '❌ Ocurrió un error al generar el audio. Revisa la consola.' }, 
        { quoted: msg }
      );
    }
  }
};
