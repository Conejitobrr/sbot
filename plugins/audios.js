'use strict';

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const db = require('../lib/database');

// 🔥 NORMALIZAR TEXTO (quita tildes)
function normalize(text = '') {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

module.exports = {
  async onMessage(ctx) {
    const { sock, remoteJid, body, sender, fromGroup, msg } = ctx;

    if (!body) return;

    // 🔥 ACTIVADO / DESACTIVADO
    try {
      if (fromGroup) {
        const enabled = await db.getGroupSetting(remoteJid, 'audios');
        if (enabled === false) return;
      } else {
        const enabled = await db.getUserSetting(sender, 'audios');
        if (enabled === false) return;
      }
    } catch (e) {
      console.log('❌ Error DB audios:', e?.message || e);
    }

    const text = normalize(body);

    // 🔥 NUEVO SISTEMA (PALABRAS + FRASES)
    const audios = [
      { triggers: ['hola'], file: 'hola.mp3' },
      { triggers: ['autoestima'], file: 'Autoestima.mp3' },
      { triggers: ['tetas'], file: 'ATetas.mp3' },
      { triggers: ['añanin'], file: 'Añañin.mp3' },
      { triggers: ['chaoo'], file: 'Chaoo.mp3' },
      { triggers: ['coger'], file: 'Coger.mp3' }, // 🔥 ya no detecta "recoger"
      { triggers: ['viernes'], file: 'viernes.mp3' },
      { triggers: ['siu','siuu','siuuu','siuuuu','siuuuuu','siuuuuuu'], file: 'siu.mp3' },
      { triggers: ['noche'], file: 'Noche.mp3' },
      { triggers: ['sexo'], file: 'S3x0g.mp3' },
      { triggers: ['linda'], file: 'Linda.mp3' },

      // 🔥 FRASES
      { triggers: ['tu no mete'], file: 'Tu no mete.mp3' },

      { triggers: ['telepatia','telepatía'], file: 'Telepatía.mp3' },
      { triggers: ['doxean', 'me doxean'], file: 'Me doxean.mp3' },
      { triggers: ['ya no es jueves'], file: 'No es jueves.mp3' },
      { triggers: ['jejeje'], file: 'Jejeje.mp3' }
    ];

    // 🔥 BUSCAR MATCH CORRECTO
    let selected = null;

    for (const audio of audios) {
      for (const trigger of audio.triggers) {
        const t = normalize(trigger);

        // 👇 FRASE COMPLETA
        if (t.includes(' ')) {
          if (text.includes(t)) {
            selected = audio;
            break;
          }
        } else {
          // 👇 PALABRA EXACTA (NO dentro de otra)
          const regex = new RegExp(`\\b${t}\\b`, 'i');
          if (regex.test(text)) {
            selected = audio;
            break;
          }
        }
      }

      if (selected) break;
    }

    if (!selected) return;

    const input = path.resolve(__dirname, '../media', selected.file);

    console.log('🎧 AUDIO TRIGGER:', selected.file);

    if (!fs.existsSync(input)) {
      console.log('❌ Audio no encontrado:', input);
      return;
    }

    // 📁 TEMP
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const output = path.join(tempDir, `voice_${Date.now()}.ogg`);

    // 🔥 CONVERTIR A NOTA DE VOZ REAL
    const cmd = `
ffmpeg -y -i "${input}" \
-vn -c:a libopus -b:a 48k \
-ar 48000 -ac 1 \
"${output}"
`;

    exec(cmd, async (err) => {
      if (err) {
        console.log('❌ FFMPEG ERROR:', err);

        return sock.sendMessage(
          remoteJid,
          { text: '❌ Error convirtiendo audio' },
          { quoted: msg }
        );
      }

      try {
        await sock.sendMessage(
          remoteJid,
          {
            audio: fs.readFileSync(output),
            mimetype: 'audio/ogg; codecs=opus',
            ptt: true
          },
          { quoted: msg }
        );
      } catch (e) {
        console.log('❌ Error enviando audio:', e);
      }

      // 🧹 limpiar
      try {
        fs.unlinkSync(output);
      } catch {}
    });
  }
};
