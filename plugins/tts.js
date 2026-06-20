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
      return sock.sendMessage(remoteJid, { text: '❌ *Uso:* .tts [texto]' }, { quoted: msg });
    }

    let textToSpeak = args.join(' ');

    if (textToSpeak.length > 200) {
      textToSpeak = textToSpeak.substring(0, 200);
      await sock.sendMessage(remoteJid, { text: '⚠️ Texto muy largo, leyendo los primeros 200 caracteres.' }, { quoted: msg });
    }

    try {
      // 1. TU CLAVE DE ELEVENLABS (Reemplaza este texto con tu clave real)
      const apiKey = 'sk_6f3c4c79fabf661e2ee0eb72fd48914b89dbf7af90c23eaa'; 
      
      // 2. ID DE LA VOZ (Esta es 'Rachel', perfecta para inglés y español)
      const voiceId = '21m00Tcm4TlvDq8ikWAM'; 
      
      const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
      
      // 3. PETICIÓN A LA IA NEURONAL
      const audioResponse = await axios.post(url, {
        text: textToSpeak,
        model_id: "eleven_multilingual_v2", // El modelo mágico que entiende el idioma solo
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      }, {
        responseType: 'arraybuffer',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        }
      });

      // 4. CONVERSIÓN A NOTA DE VOZ WHATSAPP (MP3 -> OGG Opus)
      const tempId = Date.now();
      const tempMp3 = path.join('/tmp', `tts_${tempId}.mp3`);
      const tempOgg = path.join('/tmp', `tts_${tempId}.ogg`);

      fs.writeFileSync(tempMp3, Buffer.from(audioResponse.data, 'binary'));
      await exec(`ffmpeg -i ${tempMp3} -c:a libopus -b:a 48k -vbr on -compression_level 10 -frame_duration 60 -application voip ${tempOgg}`);
      const oggBuffer = fs.readFileSync(tempOgg);

      // 5. ENVÍO (ptt: true)
      await sock.sendMessage(remoteJid, { 
        audio: oggBuffer, 
        mimetype: 'audio/ogg; codecs=opus', 
        ptt: true 
      }, { quoted: msg });

      // 6. LIMPIEZA
      try {
        fs.unlinkSync(tempMp3);
        fs.unlinkSync(tempOgg);
      } catch (err) {}

    } catch (error) {
      console.error("Error en TTS:", error.response ? error.response.data : error.message);
      await sock.sendMessage(remoteJid, { text: '❌ Ocurrió un error. Asegúrate de haber puesto tu API Key en el código.' }, { quoted: msg });
    }
  }
};
