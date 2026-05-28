'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const TEMP_DIR = path.join(process.cwd(), 'temp');
const JAIL_PATH = path.join(process.cwd(), 'lib', 'jail.json');
const DEFAULT_PROFILE = path.join(process.cwd(), 'assets', 'Sinperfil.jpg');

const JAIL_TIME = 10 * 60 * 1000;

function ensureTemp() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

function ensureDB() {
  const dir = path.dirname(JAIL_PATH);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(JAIL_PATH)) {
    fs.writeFileSync(JAIL_PATH, JSON.stringify({
      jailed: {},
      fame: {}
    }, null, 2));
  }
}

function loadDB() {
  ensureDB();

  try {
    return JSON.parse(fs.readFileSync(JAIL_PATH, 'utf8') || '{}');
  } catch {
    return {
      jailed: {},
      fame: {}
    };
  }
}

function saveDB(data) {
  ensureDB();
  fs.writeFileSync(JAIL_PATH, JSON.stringify(data, null, 2));
}

function cleanJid(jid = '') {
  return String(jid).split(':')[0];
}

function number(jid = '') {
  return cleanJid(jid)
    .split('@')[0]
    .replace(/\D/g, '');
}

function getMentioned(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
}

function msToTime(ms = 0) {
  const total = Math.max(0, Math.floor(ms / 1000));

  const m = Math.floor(total / 60);
  const s = total % 60;

  return `${m} min ${s} seg`;
}

async function downloadProfile(sock, jid, output) {
  try {
    const url = await sock.profilePictureUrl(jid, 'image');

    const res = await axios.get(url, {
      responseType: 'arraybuffer'
    });

    fs.writeFileSync(output, res.data);

  } catch {

    if (fs.existsSync(DEFAULT_PROFILE)) {
      fs.copyFileSync(DEFAULT_PROFILE, output);
    } else {
      throw new Error('Falta assets/Sinperfil.jpg');
    }
  }
}

async function makeArrestImage(input, output, username) {

  await execFileAsync('convert', [
    input,

    '-resize', '720x720^',
    '-gravity', 'center',
    '-extent', '720x720',

    '-fill', 'rgba(0,0,0,0.45)',
    '-draw', 'rectangle 0,0 720,720',

    '-fill', '#ff2d2d',
    '-stroke', '#ffffff',
    '-strokewidth', '3',

    '-gravity', 'center',

    '-font', 'DejaVu-Sans-Bold',
    '-pointsize', '82',

    '-annotate', '-20', 'ARRESTADO',

    '-fill', '#ffffff',
    '-stroke', 'none',

    '-gravity', 'south',

    '-pointsize', '34',

    '-annotate', '+0+40', username,

    output
  ]);
}

module.exports = {
  commands: ['policia', 'denunciar', 'carcel', 'fama'],

  async execute({
    sock,
    remoteJid,
    msg,
    sender,
    pushName,
    command
  }) {

    let profile = null;
    let image = null;

    try {

      const db = loadDB();

      db.jailed = db.jailed || {};
      db.fame = db.fame || {};

      const now = Date.now();

      if (command === 'carcel') {

        const jail = db.jailed[cleanJid(sender)];

        if (!jail || jail.until <= now) {

          delete db.jailed[cleanJid(sender)];

          saveDB(db);

          return sock.sendMessage(remoteJid, {
            text: '✅ No estás arrestado.'
          }, { quoted: msg });
        }

        return sock.sendMessage(remoteJid, {
          text:
`⛓️ *ESTÁS ARRESTADO*

⏳ Tiempo restante:
*${msToTime(jail.until - now)}*

💸 Usa *.sobornar* para intentar salir.`
        }, { quoted: msg });
      }

      if (command === 'fama') {

        const fame = db.fame[cleanJid(sender)] || 0;

        return sock.sendMessage(remoteJid, {
          text:
`☠️ *FAMA CRIMINAL*

👤 @${number(sender)}
🔥 Nivel criminal: *${fame}*
🚨 Riesgo policial: *${Math.min(90, fame + 10)}%*`,
          mentions: [sender]
        }, { quoted: msg });
      }

      const target = cleanJid(getMentioned(msg)[0]);

      if (!target) {
        return sock.sendMessage(remoteJid, {
          text:
`❌ Menciona al sospechoso.

Ejemplo:
.policia @usuario`
        }, { quoted: msg });
      }

      if (target === cleanJid(sender)) {
        return sock.sendMessage(remoteJid, {
          text: '😹 No puedes denunciarte a ti mismo.'
        }, { quoted: msg });
      }

      const escaped = Math.random() < 0.35;

      if (escaped) {

        db.fame[target] = (db.fame[target] || 0) + 5;

        saveDB(db);

        return sock.sendMessage(remoteJid, {
          text:
`🚓 *LA POLICÍA LLEGÓ TARDE*

@${number(target)} escapó del país 😹

☠️ Fama criminal: *${db.fame[target]}*`,
          mentions: [target]
        }, { quoted: msg });
      }

      ensureTemp();

      const id = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;

      profile = path.join(TEMP_DIR, `arrest_${id}.jpg`);
      image = path.join(TEMP_DIR, `arrest_final_${id}.jpg`);

      await downloadProfile(sock, target, profile);

      await makeArrestImage(
        profile,
        image,
        number(target)
      );

      db.jailed[target] = {
        until: now + JAIL_TIME,
        by: cleanJid(sender)
      };

      db.fame[target] = (db.fame[target] || 0) + 10;

      saveDB(db);

      await sock.sendMessage(remoteJid, {
        image: fs.readFileSync(image),
        caption:
`🚔 *POLICÍA DEL GRUPO*

👮 Sospechoso arrestado:
@${number(target)}

⛓️ Condena:
*10 minutos en prisión*

☠️ Fama criminal:
*${db.fame[target]}*

💸 Puede intentar escapar usando:
*.sobornar*`,
        mentions: [target]
      }, { quoted: msg });

    } catch (err) {

      console.log('❌ Error policia:', err?.message || err);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error usando el sistema policial.'
      }, { quoted: msg });

    } finally {

      for (const file of [profile, image]) {
        try {
          if (file && fs.existsSync(file)) {
            fs.unlinkSync(file);
          }
        } catch {}
      }
    }
  }
};
