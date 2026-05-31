'use strict';

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const db = require('../lib/database');

const execFileAsync = promisify(execFile);

const MEDIA_DIR = path.resolve(__dirname, '../media');

const AUDIO_EXTENSIONS = [
  '.mp3',
  '.ogg',
  '.opus',
  '.wav',
  '.m4a',
  '.aac',
  '.flac',
  '.webm',
  '.mp4',
  '.mpeg'
];

// 🔥 NORMALIZAR TEXTO (quita tildes)
function normalize(text = '') {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function escapeRegExp(text = '') {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeFileName(name = '') {
  return normalize(name)
    .trim()
    .replace(/\s+/g, ' ');
}

// 🔥 Buscar audio por nombre base sin importar extensión
function resolveAudioFile(file = '') {
  if (!file) return null;

  if (!fs.existsSync(MEDIA_DIR)) {
    console.log('❌ Carpeta media no encontrada:', MEDIA_DIR);
    return null;
  }

  const directPath = path.resolve(MEDIA_DIR, file);

  if (fs.existsSync(directPath)) {
    return directPath;
  }

  const wantedExt = path.extname(file).toLowerCase();
  const wantedBase = normalizeFileName(
    wantedExt
      ? path.basename(file, wantedExt)
      : path.basename(file)
  );

  const files = fs.readdirSync(MEDIA_DIR);

  for (const item of files) {
    const full = path.join(MEDIA_DIR, item);

    try {
      if (!fs.statSync(full).isFile()) continue;
    } catch {
      continue;
    }

    const ext = path.extname(item).toLowerCase();

    if (!AUDIO_EXTENSIONS.includes(ext)) continue;

    const base = normalizeFileName(path.basename(item, ext));

    if (base === wantedBase) {
      return full;
    }
  }

  return null;
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

    // 🔥 SISTEMA DE AUDIOS
    // ✅ Ahora file va sin extensión
    const audios = [
      { triggers: ['hola'], file: 'hola' },
      { triggers: ['autoestima'], file: 'Autoestima' },
      { triggers: ['tetas'], file: 'ATetas' },
      { triggers: ['añanin'], file: 'Añañin' },
      { triggers: ['chaoo'], file: 'Chaoo' },
      { triggers: ['coger'], file: 'Coger' },
      { triggers: ['viernes'], file: 'viernes' },
      { triggers: ['siu', 'siuu', 'siuuu', 'siuuuu', 'siuuuuu', 'siuuuuuu'], file: 'siu' },
      { triggers: ['noche'], file: 'Noche' },
      { triggers: ['sexo'], file: 'S3x0g' },
      { triggers: ['mff'], file: 'Mff' },
      { triggers: ['linda'], file: 'Linda' },
      { triggers: ['chamba'], file: 'Chamba' },
      { triggers: ['uwu'], file: 'UwU' },
      { triggers: ['ag'], file: 'Asco' },

      // 🔥 FRASES
      { triggers: ['tu no mete'], file: 'Tu no mete' },
      { triggers: ['telepatia', 'telepatía'], file: 'Telepatía' },
      { triggers: ['un pato'], file: 'pato' },
      { triggers: ['bendicion'], file: 'Bendicion' },
      { triggers: ['compartan'], file: 'Compartan' },
      { triggers: ['brr'], file: 'Brr' },
      { triggers: ['llamaba charly'], file: 'Llamaba charly' },
      { triggers: ['mis ojos'], file: 'Mis ojos' },
      { triggers: ['pipipi'], file: 'Pipipi' },
      { triggers: ['epico','épico'], file: 'Épico' },
      { triggers: ['me voy'], file: 'Me voy' },
      { triggers: ['una basura'], file: 'Basura' },
      { triggers: ['cancer','cáncer'], file: 'Cáncer' },
      { triggers: ['doxean', 'me doxean'], file: 'Me doxean' },
      { triggers: ['no es jueves'], file: 'No es jueves' },
      { triggers: ['jejeje'], file: 'Jejeje' }
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
          const regex = new RegExp(`\\b${escapeRegExp(t)}\\b`, 'i');

          if (regex.test(text)) {
            selected = audio;
            break;
          }
        }
      }

      if (selected) break;
    }

    if (!selected) return;

    const input = resolveAudioFile(selected.file);

    console.log(
      '🎧 AUDIO TRIGGER:',
      selected.file,
      '=>',
      input ? path.basename(input) : 'NO ENCONTRADO'
    );

    if (!input || !fs.existsSync(input)) {
      console.log('❌ Audio no encontrado para:', selected.file);
      return;
    }

    // 📁 TEMP
    const tempDir = path.join(__dirname, '../temp');

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const output = path.join(
      tempDir,
      `voice_${Date.now()}_${Math.floor(Math.random() * 9999)}.ogg`
    );

    try {
      // 🔥 CONVERTIR CUALQUIER AUDIO A NOTA DE VOZ REAL
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
