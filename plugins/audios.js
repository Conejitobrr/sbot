'use strict';

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const db = require('../lib/database');

const execFileAsync = promisify(execFile);

// 🔥 NORMALIZAR TEXTO (quita tildes)
function normalize(text = '') {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

async function convertToVoice(input, output) {
  await execFileAsync('ffmpeg', [
    '-y',
    '-i', input,

    // ✅ Usar primera pista de audio y corregir timestamps raros
    '-vn',
    '-map', '0:a:0',
    '-af', 'aresample=async=1:first_pts=0',

    // ✅ Nota de voz compatible con WhatsApp
    '-c:a', 'libopus',
    '-application', 'voip',
    '-b:a', '48k',
    '-ar', '48000',
    '-ac', '1',
    '-frame_duration', '20',
    '-f', 'ogg',

    output
  ], {
    timeout: 60000,
    maxBuffer: 1024 * 1024 * 10
  });
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
      { triggers: ['coger'], file: 'Coger.mp3' },
      { triggers: ['viernes'], file: 'viernes.mp3' },
      { triggers: ['siu', 'siuu', 'siuuu', 'siuuuu', 'siuuuuu', 'siuuuuuu'], file: 'siu.mp3' },
      { triggers: ['noche'], file: 'Noche.mp3' },
      { triggers: ['sexo'], file: 'S3x0g.mp3' },
      { triggers: ['mff'], file: 'Mff.mp3' },
      { triggers: ['linda'], file: 'Linda.mp3' },
      { triggers: ['chamba'], file: 'Chamba.mp3' },
      { triggers: ['uwu'], file: 'UwU.mp3' },
      { triggers: ['ag'], file: 'Asco.mp3' },

      // 🔥 FRASES
      { triggers: ['tu no mete'], file: 'Tu no mete.mp3' },
      { triggers: ['bot feo'], file: 'Elmo.mp3' },
      { triggers: ['telepatia', 'telepatía'], file: 'Telepatía.mp3' },
      { triggers: ['me voy'], file: 'Me voy.mp3' },
      { triggers: ['doxean', 'me doxean'], file: 'Me doxean.mp3' },
      { triggers: ['no es jueves'], file: 'No es jueves.mp3' },
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

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const output = path.join(tempDir, `voice_${Date.now()}_${Math.floor(Math.random() * 9999)}.ogg`);

    try {
      // 🔥 CONVERTIR A NOTA DE VOZ REAL
      await convertToVoice(input, output);

      if (!fs.existsSync(output) || fs.statSync(output).size <= 0) {
        return sock.sendMessage(
          remoteJid,
          { text: '❌ El audio convertido salió vacío.' },
          { quoted: msg }
        );
      }

      await sock.sendMessage(
        remoteJid,
        {
          audio: fs.readFileSync(output),
          mimetype: 'audio/ogg; codecs=opus',
          ptt: true
        },
        { quoted: msg }
      );

    } catch (err) {
      console.log('❌ FFMPEG ERROR:', err?.message || err);

      return sock.sendMessage(
        remoteJid,
        { text: '❌ Error convirtiendo audio' },
        { quoted: msg }
      );

    } finally {
      // 🧹 limpiar
      try {
        if (fs.existsSync(output)) {
          fs.unlinkSync(output);
        }
      } catch {}
    }
  }
};
