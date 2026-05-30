'use strict';

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const execFileAsync = promisify(execFile);

const TEMP_DIR = path.join(process.cwd(), 'temp');

function ensureTemp() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

function cleanJid(jid = '') {
  return String(jid).split(':')[0];
}

function getQuotedContext(msg) {
  return (
    msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.audioMessage?.contextInfo ||
    msg.message?.documentMessage?.contextInfo ||
    msg.message?.videoMessage?.contextInfo ||
    null
  );
}

function unwrapMessage(message = {}) {
  if (message.ephemeralMessage?.message) {
    return unwrapMessage(message.ephemeralMessage.message);
  }

  if (message.documentWithCaptionMessage?.message) {
    return unwrapMessage(message.documentWithCaptionMessage.message);
  }

  return message;
}

function getQuotedMessage(msg) {
  const ctx = getQuotedContext(msg);
  const quoted = ctx?.quotedMessage || null;

  return quoted ? unwrapMessage(quoted) : null;
}

function getMessageContent(msg) {
  return getQuotedMessage(msg) || unwrapMessage(msg.message || {});
}

function isAudioFileName(name = '') {
  const lower = String(name || '').toLowerCase();

  return (
    lower.endsWith('.mp3') ||
    lower.endsWith('.m4a') ||
    lower.endsWith('.ogg') ||
    lower.endsWith('.opus') ||
    lower.endsWith('.wav') ||
    lower.endsWith('.aac') ||
    lower.endsWith('.flac') ||
    lower.endsWith('.mpeg')
  );
}

function getAudioInfo(message = {}) {
  if (message.audioMessage) {
    return {
      type: 'audio',
      downloadType: 'audio',
      media: message.audioMessage,
      mimetype: message.audioMessage.mimetype || 'audio/mpeg',
      fileName: message.audioMessage.ptt ? 'nota_voz.ogg' : 'audio.mp3',
      ptt: message.audioMessage.ptt || false
    };
  }

  if (message.documentMessage) {
    const mimetype = message.documentMessage.mimetype || '';
    const fileName = message.documentMessage.fileName || 'audio';

    if (mimetype.startsWith('audio/') || isAudioFileName(fileName)) {
      return {
        type: 'document',
        downloadType: 'document',
        media: message.documentMessage,
        mimetype,
        fileName,
        ptt: false
      };
    }
  }

  return null;
}

async function downloadMedia(media, downloadType) {
  const stream = await downloadContentFromMessage(media, downloadType);
  const chunks = [];

  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

function getExtension(info = {}) {
  const name = String(info.fileName || '').toLowerCase();
  const mime = String(info.mimetype || '').toLowerCase();

  if (name.endsWith('.mp3')) return 'mp3';
  if (name.endsWith('.m4a')) return 'm4a';
  if (name.endsWith('.ogg')) return 'ogg';
  if (name.endsWith('.opus')) return 'ogg';
  if (name.endsWith('.wav')) return 'wav';
  if (name.endsWith('.aac')) return 'aac';
  if (name.endsWith('.flac')) return 'flac';

  if (mime.includes('mpeg')) return 'mp3';
  if (mime.includes('mp3')) return 'mp3';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('opus')) return 'ogg';
  if (mime.includes('wav')) return 'wav';
  if (mime.includes('aac')) return 'aac';
  if (mime.includes('flac')) return 'flac';
  if (mime.includes('mp4')) return 'm4a';

  return 'bin';
}

const FILTERS = {
  normal: {
    name: 'Normal',
    filter: 'volume=1'
  },

  grave: {
    name: 'Voz grave',
    filter: 'asetrate=44100*0.75,aresample=44100,atempo=1.15'
  },

  agudo: {
    name: 'Voz aguda',
    filter: 'asetrate=44100*1.35,aresample=44100,atempo=0.90'
  },

  ardilla: {
    name: 'Ardilla',
    filter: 'asetrate=44100*1.60,aresample=44100,atempo=0.85'
  },

  demonio: {
    name: 'Demonio',
    filter: 'asetrate=44100*0.65,aresample=44100,atempo=1.05,aecho=0.8:0.9:900:0.35'
  },

  robot: {
    name: 'Robot',
    filter: 'tremolo=f=35:d=0.8,aresample=16000'
  },

  eco: {
    name: 'Eco',
    filter: 'aecho=0.8:0.9:1000:0.35'
  },

  cueva: {
    name: 'Cueva',
    filter: 'aecho=0.8:0.88:60|120|240:0.4|0.3|0.2'
  },

  radio: {
    name: 'Radio',
    filter: 'highpass=f=300,lowpass=f=3000,acompressor=threshold=-18dB:ratio=3:attack=20:release=250'
  },

  telefono: {
    name: 'Teléfono',
    filter: 'highpass=f=500,lowpass=f=2500,volume=1.4'
  },

  bajo: {
    name: 'Bajos fuertes',
    filter: 'bass=g=12:f=110,acompressor=threshold=-16dB:ratio=3'
  },

  rapido: {
    name: 'Rápido',
    filter: 'atempo=1.35'
  },

  lento: {
    name: 'Lento',
    filter: 'atempo=0.75'
  },

  reverse: {
    name: 'Reversa',
    filter: 'areverse'
  }
};

const ALIASES = {
  chipmunk: 'ardilla',
  diablo: 'demonio',
  gravecito: 'grave',
  aguda: 'agudo',
  robotico: 'robot',
  teléfono: 'telefono',
  phone: 'telefono',
  bass: 'bajo',
  reversa: 'reverse',
  reves: 'reverse',
  rápido: 'rapido'
};

function getFilterKey(input = '') {
  const key = String(input || '').toLowerCase().trim();
  return ALIASES[key] || key;
}

function filterMenu(prefix = '.') {
  return `🎛️ *FILTROS DE AUDIO*

Responde a un audio, nota de voz o archivo de audio y usa:

${prefix}filtro normal
${prefix}filtro grave
${prefix}filtro agudo
${prefix}filtro ardilla
${prefix}filtro demonio
${prefix}filtro robot
${prefix}filtro eco
${prefix}filtro cueva
${prefix}filtro radio
${prefix}filtro telefono
${prefix}filtro bajo
${prefix}filtro rapido
${prefix}filtro lento
${prefix}filtro reverse

📌 Ejemplo:
${prefix}filtro demonio

✅ El resultado siempre se enviará como *nota de voz*.`;
}

async function applyAudioFilter(input, output, filter) {
  const args = [
    '-y',
    '-i', input,
    '-vn'
  ];

  if (filter) {
    args.push('-af', filter);
  }

  args.push(
    '-ac', '1',
    '-ar', '48000',
    '-c:a', 'libopus',
    '-b:a', '64k',
    '-vbr', 'on',
    '-compression_level', '10',
    output
  );

  await execFileAsync('ffmpeg', args);
}

module.exports = {
  commands: ['filtro', 'filtros', 'audiofx', 'vozfx'],

  async execute(ctx) {
    const {
      sock,
      msg,
      remoteJid,
      sender,
      args,
      command,
      config,
      db
    } = ctx;

    let input = null;
    let output = null;

    try {
      const p = config?.prefix || '.';

      if (command === 'filtros' || !args.length) {
        return sock.sendMessage(remoteJid, {
          text: filterMenu(p)
        }, { quoted: msg });
      }

      const filterKey = getFilterKey(args[0]);
      const selected = FILTERS[filterKey];

      if (!selected) {
        return sock.sendMessage(remoteJid, {
          text:
`❌ Filtro no disponible: *${args[0]}*

Usa:
${p}filtros`
        }, { quoted: msg });
      }

      ensureTemp();

      const message = getMessageContent(msg);
      const info = getAudioInfo(message);

      if (!info) {
        return sock.sendMessage(remoteJid, {
          text:
`❌ Responde a un audio, nota de voz o archivo de audio.

Ejemplo:
${p}filtro robot`
        }, { quoted: msg });
      }

      if (!info.media.url && !info.media.mediaKey) {
        return sock.sendMessage(remoteJid, {
          text: '❌ No se pudo obtener el audio.'
        }, { quoted: msg });
      }

      await sock.sendMessage(remoteJid, {
        text: `🎧 Aplicando filtro: *${selected.name}*...`
      }, { quoted: msg });

      const buffer = await downloadMedia(info.media, info.downloadType);

      if (!buffer || !buffer.length) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Error descargando el audio.'
        }, { quoted: msg });
      }

      const id = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;
      const ext = getExtension(info);

      input = path.join(TEMP_DIR, `audiofx_input_${id}.${ext}`);
      output = path.join(TEMP_DIR, `audiofx_output_${id}.ogg`);

      fs.writeFileSync(input, buffer);

      await applyAudioFilter(input, output, selected.filter);

      const audio = fs.readFileSync(output);

      await sock.sendMessage(remoteJid, {
        audio,
        mimetype: 'audio/ogg; codecs=opus',
        ptt: true
      }, { quoted: msg });

      try {
        if (db?.addXP) {
          await db.addXP(cleanJid(sender), Math.floor(Math.random() * 16) + 10);
        }
      } catch {}

    } catch (err) {
      console.log('❌ Error en filtro audio:', err?.message || err);

      return sock.sendMessage(remoteJid, {
        text: '❌ Error aplicando el filtro. Asegúrate de tener ffmpeg instalado.'
      }, { quoted: msg });

    } finally {
      for (const file of [input, output]) {
        try {
          if (file && fs.existsSync(file)) {
            fs.unlinkSync(file);
          }
        } catch {}
      }
    }
  }
};
