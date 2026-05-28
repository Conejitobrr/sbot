'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execFile } = require('child_process');
const { promisify } = require('util');
const shop = require('../lib/shop');

const execFileAsync = promisify(execFile);

const TEMP_DIR = path.join(process.cwd(), 'temp');
const JAIL_PATH = path.join(process.cwd(), 'lib', 'jail.json');
const ROBOS_PATH = path.join(process.cwd(), 'lib', 'robos_recientes.json');
const NICKS_PATH = path.join(process.cwd(), 'lib', 'fakeig_nicks.json');
const DEFAULT_PROFILE = path.join(process.cwd(), 'assets', 'Sinperfil.jpg');

const JAIL_TIME = 10 * 60 * 1000;
const ROB_TIME = 5 * 60 * 1000;

// 💰 FIANZA
const BASE_FIANZA = 1000;
const EXTRA_FIANZA_POR_FAMA = 100;
const MAX_FIANZA = 50000;

// 💸 SOBORNO
const BASE_SOBORNO = 500;
const EXTRA_SOBORNO_POR_FAMA = 50;
const EXTRA_SOBORNO_POR_INTENTO = 1000;
const MAX_SOBORNO = 25000;
const MAX_SOBORNO_INTENTOS = 3;
const PENALIDAD_SOBORNO = 5 * 60 * 1000;

// 📉 FAMA BAJA SI DEJA DE ROBAR
const DECAY_INTERVAL = 12 * 60 * 60 * 1000;
const DECAY_AMOUNT = 5;

function ensureTemp() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

function cleanJid(jid = '') {
  return String(jid).split(':')[0];
}

function number(jid = '') {
  return cleanJid(jid).split('@')[0].replace(/\D/g, '');
}

function getMentioned(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
}

function ensureFile(file, def) {
  const dir = path.dirname(file);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(def, null, 2));
  }
}

function loadJail() {
  ensureFile(JAIL_PATH, {
    jailed: {},
    fame: {},
    lastCrimeAt: {}
  });

  try {
    const data = JSON.parse(fs.readFileSync(JAIL_PATH, 'utf8') || '{}');

    return {
      jailed: data.jailed || {},
      fame: data.fame || {},
      lastCrimeAt: data.lastCrimeAt || {}
    };
  } catch {
    return {
      jailed: {},
      fame: {},
      lastCrimeAt: {}
    };
  }
}

function saveJail(data) {
  ensureFile(JAIL_PATH, {
    jailed: {},
    fame: {},
    lastCrimeAt: {}
  });

  fs.writeFileSync(JAIL_PATH, JSON.stringify({
    jailed: data.jailed || {},
    fame: data.fame || {},
    lastCrimeAt: data.lastCrimeAt || {}
  }, null, 2));
}

function loadRobos() {
  ensureFile(ROBOS_PATH, {});

  try {
    return JSON.parse(fs.readFileSync(ROBOS_PATH, 'utf8') || '{}');
  } catch {
    return {};
  }
}

function saveRobos(data) {
  ensureFile(ROBOS_PATH, {});
  fs.writeFileSync(ROBOS_PATH, JSON.stringify(data, null, 2));
}

function loadNicks() {
  try {
    if (!fs.existsSync(NICKS_PATH)) return {};
    return JSON.parse(fs.readFileSync(NICKS_PATH, 'utf8') || '{}');
  } catch {
    return {};
  }
}

function cleanName(name = '') {
  return String(name || '')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 25);
}

function msToTime(ms = 0) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m} min ${s} seg`;
}

function getNickFromSources(jid, store, groupMetadata) {
  jid = cleanJid(jid);

  const saved = loadNicks();
  if (saved[jid]?.name) return cleanName(saved[jid].name);

  const contact =
    store?.contacts?.[jid] ||
    {};

  const participant = groupMetadata?.participants?.find(p =>
    cleanJid(p.id) === jid ||
    cleanJid(p.jid) === jid ||
    cleanJid(p.lid) === jid ||
    cleanJid(p.participant) === jid
  ) || {};

  return cleanName(
    contact.name ||
    contact.notify ||
    contact.verifiedName ||
    contact.pushName ||
    participant.name ||
    participant.notify ||
    participant.verifiedName ||
    participant.pushName ||
    ''
  );
}

function tag(jid, store, groupMetadata) {
  return `@${number(jid)}`;
}

function applyFameDecay(jailDB, jid) {
  const user = cleanJid(jid);

  jailDB.fame = jailDB.fame || {};
  jailDB.lastCrimeAt = jailDB.lastCrimeAt || {};

  let fame = Number(jailDB.fame[user] || 0);

  if (fame <= 0) {
    jailDB.fame[user] = 0;
    jailDB.lastCrimeAt[user] = Date.now();
    return 0;
  }

  const lastCrime = Number(jailDB.lastCrimeAt[user] || 0);

  if (!lastCrime) {
    jailDB.lastCrimeAt[user] = Date.now();
    return fame;
  }

  const passed = Date.now() - lastCrime;
  const steps = Math.floor(passed / DECAY_INTERVAL);

  if (steps > 0) {
    fame = Math.max(0, fame - (steps * DECAY_AMOUNT));
    jailDB.fame[user] = fame;
    jailDB.lastCrimeAt[user] = Date.now();
  }

  return fame;
}

function addFame(jailDB, jid, amount) {
  const user = cleanJid(jid);

  jailDB.fame = jailDB.fame || {};
  jailDB.lastCrimeAt = jailDB.lastCrimeAt || {};

  jailDB.fame[user] = Math.max(
    0,
    Number(jailDB.fame[user] || 0) + Number(amount || 0)
  );

  jailDB.lastCrimeAt[user] = Date.now();

  return jailDB.fame[user];
}

function getFianzaCost(fame = 0) {
  return Math.min(
    MAX_FIANZA,
    BASE_FIANZA + (Number(fame || 0) * EXTRA_FIANZA_POR_FAMA)
  );
}

function getSobornoCost(fame = 0, attempts = 0) {
  return Math.min(
    MAX_SOBORNO,
    BASE_SOBORNO +
    (Number(fame || 0) * EXTRA_SOBORNO_POR_FAMA) +
    (Number(attempts || 0) * EXTRA_SOBORNO_POR_INTENTO)
  );
}

async function getJailOptions(jailDB, jid) {
  const user = cleanJid(jid);
  const jail = jailDB.jailed?.[user] || {};

  const fame = applyFameDecay(jailDB, user);
  const attempts = Number(jail.sobornoAttempts || 0);
  const remainingAttempts = Math.max(0, MAX_SOBORNO_INTENTOS - attempts);

  const fianzaCost = getFianzaCost(fame);
  const sobornoCost = remainingAttempts > 0
    ? getSobornoCost(fame, attempts)
    : 0;

  let keys = 0;

  try {
    const inv = await shop.getInventory(user);
    keys = Number(inv.keys || 0);
  } catch {
    keys = 0;
  }

  return {
    fame,
    attempts,
    remainingAttempts,
    fianzaCost,
    sobornoCost,
    keys
  };
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

async function makeArrestTile(input, output, title = 'ARRESTADO') {
  await execFileAsync('convert', [
    input,

    '-resize', '720x720^',
    '-gravity', 'center',
    '-extent', '720x720',

    '-fill', 'rgba(0,0,0,0.28)',
    '-draw', 'rectangle 0,0 720,720',

    '-fill', 'rgba(18,18,18,0.92)',
    '-draw', 'rectangle 72,0 108,720',
    '-draw', 'rectangle 218,0 254,720',
    '-draw', 'rectangle 364,0 400,720',
    '-draw', 'rectangle 510,0 546,720',
    '-draw', 'rectangle 656,0 692,720',

    '-fill', 'rgba(255,255,255,0.32)',
    '-draw', 'rectangle 78,0 86,720',
    '-draw', 'rectangle 224,0 232,720',
    '-draw', 'rectangle 370,0 378,720',
    '-draw', 'rectangle 516,0 524,720',
    '-draw', 'rectangle 662,0 670,720',

    '-fill', 'rgba(0,0,0,0.55)',
    '-draw', 'rectangle 98,0 108,720',
    '-draw', 'rectangle 244,0 254,720',
    '-draw', 'rectangle 390,0 400,720',
    '-draw', 'rectangle 536,0 546,720',
    '-draw', 'rectangle 682,0 692,720',

    '-fill', 'rgba(18,18,18,0.92)',
    '-draw', 'rectangle 0,138 720,170',
    '-draw', 'rectangle 0,350 720,382',
    '-draw', 'rectangle 0,562 720,594',

    '-fill', 'rgba(255,255,255,0.28)',
    '-draw', 'rectangle 0,142 720,149',
    '-draw', 'rectangle 0,354 720,361',
    '-draw', 'rectangle 0,566 720,573',

    '-fill', 'rgba(0,0,0,0.55)',
    '-draw', 'rectangle 0,162 720,170',
    '-draw', 'rectangle 0,374 720,382',
    '-draw', 'rectangle 0,586 720,594',

    '-fill', 'rgba(0,0,0,0.35)',
    '-draw', 'circle 90,154 118,154',
    '-draw', 'circle 236,154 264,154',
    '-draw', 'circle 382,154 410,154',
    '-draw', 'circle 528,154 556,154',
    '-draw', 'circle 674,154 702,154',

    '-draw', 'circle 90,366 118,366',
    '-draw', 'circle 236,366 264,366',
    '-draw', 'circle 382,366 410,366',
    '-draw', 'circle 528,366 556,366',
    '-draw', 'circle 674,366 702,366',

    '-draw', 'circle 90,578 118,578',
    '-draw', 'circle 236,578 264,578',
    '-draw', 'circle 382,578 410,578',
    '-draw', 'circle 528,578 556,578',
    '-draw', 'circle 674,578 702,578',

    '-fill', 'rgba(185,0,0,0.86)',
    '-draw', 'rectangle 0,292 720,420',

    '-fill', 'rgba(255,255,255,0.18)',
    '-draw', 'rectangle 0,292 720,302',
    '-fill', 'rgba(0,0,0,0.30)',
    '-draw', 'rectangle 0,410 720,420',

    '-fill', '#ffffff',
    '-stroke', '#000000',
    '-strokewidth', '4',
    '-gravity', 'center',
    '-font', 'DejaVu-Sans-Bold',
    '-pointsize', '76',
    '-annotate', '0', title,

    output
  ]);
}

async function makeArrestCollage(sock, captured, output) {
  ensureTemp();

  const files = [];

  try {
    for (let i = 0; i < captured.length; i++) {
      const jid = cleanJid(captured[i].thief);

      const profile = path.join(TEMP_DIR, `police_profile_${Date.now()}_${i}.jpg`);
      const tile = path.join(TEMP_DIR, `police_tile_${Date.now()}_${i}.jpg`);

      await downloadProfile(sock, jid, profile);
      await makeArrestTile(profile, tile);

      files.push(profile, tile);
    }

    const tiles = files.filter(f => f.includes('police_tile_'));

    if (tiles.length === 1) {
      fs.copyFileSync(tiles[0], output);
      return;
    }

    const columns = tiles.length <= 2 ? 2 : 3;

    await execFileAsync('montage', [
      ...tiles,
      '-tile', `${columns}x`,
      '-geometry', '720x720+8+8',
      '-background', '#111111',
      output
    ]);

  } finally {
    for (const file of files) {
      try {
        if (file && fs.existsSync(file)) fs.unlinkSync(file);
      } catch {}
    }
  }
}

module.exports = {
  commands: ['policia', 'policía', 'denunciar', 'carcel', 'fama', 'sobornar', 'fianza'],

  async execute({ sock, remoteJid, msg, sender, command, args, store, groupMetadata, db }) {
    let collagePath = null;

    try {
      const now = Date.now();
      const me = cleanJid(sender);

      const jailDB = loadJail();
      jailDB.jailed = jailDB.jailed || {};
      jailDB.fame = jailDB.fame || {};
      jailDB.lastCrimeAt = jailDB.lastCrimeAt || {};

      applyFameDecay(jailDB, me);

      if (command === 'carcel') {
        const jail = jailDB.jailed[me];

        if (!jail || jail.until <= now) {
          delete jailDB.jailed[me];
          saveJail(jailDB);

          return sock.sendMessage(remoteJid, {
            text: '✅ No estás arrestado.'
          }, { quoted: msg });
        }

        const options = await getJailOptions(jailDB, me);
        saveJail(jailDB);

        return sock.sendMessage(remoteJid, {
          text:
`⛓️ *ESTÁS ARRESTADO*

⏳ Tiempo restante: *${msToTime(jail.until - now)}*
☠️ Fama criminal: *${options.fame}*

💰 *FIANZA SEGURA*
➤ Costo: *${options.fianzaCost} XP*
➤ Usar: *.fianza pagar*

💸 *SOBORNO ARRIESGADO*
➤ Intentos restantes: *${options.remainingAttempts}/${MAX_SOBORNO_INTENTOS}*
➤ Costo actual: *${options.remainingAttempts > 0 ? `${options.sobornoCost} XP` : 'Sin intentos'}*
➤ Usar: *.sobornar pagar*
➤ Si falla: pierdes XP y se suman *5 minutos* más.

🔑 *LLAVE DE CELDA*
➤ Llaves disponibles: *${options.keys}*
➤ Usar: *.usar llave*`
        }, { quoted: msg });
      }

      if (command === 'fama') {
        const fame = jailDB.fame[me] || 0;
        saveJail(jailDB);

        return sock.sendMessage(remoteJid, {
          text:
`☠️ *FAMA CRIMINAL*

👤 ${tag(me, store, groupMetadata)}
🔥 Nivel criminal: *${fame}*
🚨 Riesgo policial: *${Math.min(90, 10 + fame)}%*

📉 Si dejas de robar seguido, tu fama bajará poco a poco.`,
          mentions: [me]
        }, { quoted: msg });
      }

      if (command === 'fianza') {
        const jail = jailDB.jailed[me];

        if (!jail || jail.until <= now) {
          if (jail) {
            delete jailDB.jailed[me];
            saveJail(jailDB);
          }

          return sock.sendMessage(remoteJid, {
            text: '✅ No estás arrestado. No necesitas pagar fianza.'
          }, { quoted: msg });
        }

        const options = await getJailOptions(jailDB, me);
        const userData = await db.getUser(me);
        const xp = Number(userData.xp || 0);
        const option = (args?.[0] || '').toLowerCase();

        if (!['pagar', 'pay', 'si', 'sí', 'confirmar'].includes(option)) {
          saveJail(jailDB);

          return sock.sendMessage(remoteJid, {
            text:
`💰 *FIANZA DISPONIBLE*

👤 Usuario: ${tag(me, store, groupMetadata)}
⛓️ Tiempo restante: *${msToTime(jail.until - now)}*

☠️ Fama criminal: *${options.fame}*
💸 Costo de fianza: *${options.fianzaCost} XP*
⭐ Tu XP actual: *${xp} XP*

📌 La fianza es salida segura.
📌 Mientras más fama criminal tengas, más cara será.

Para pagar:
*.fianza pagar*`,
            mentions: [me]
          }, { quoted: msg });
        }

        if (xp < options.fianzaCost) {
          return sock.sendMessage(remoteJid, {
            text:
`❌ No tienes suficiente XP para pagar la fianza.

💸 Fianza: *${options.fianzaCost} XP*
⭐ Tu XP actual: *${xp} XP*
📌 Te faltan: *${options.fianzaCost - xp} XP*

Usa más el bot, reclama XP o participa en eventos para juntar más.`
          }, { quoted: msg });
        }

        await db.removeXP(me, options.fianzaCost);

        delete jailDB.jailed[me];
        jailDB.fame[me] = Math.max(0, Number(jailDB.fame[me] || 0) - 3);
        jailDB.lastCrimeAt[me] = Date.now();

        saveJail(jailDB);

        return sock.sendMessage(remoteJid, {
          text:
`💰 *FIANZA PAGADA*

👤 ${tag(me, store, groupMetadata)} pagó *${options.fianzaCost} XP*.

✅ Saliste de prisión.
☠️ Tu fama criminal bajó un poco.

Ya puedes usar comandos nuevamente.`,
          mentions: [me]
        }, { quoted: msg });
      }

      if (command === 'sobornar') {
        const jail = jailDB.jailed[me];

        if (!jail || jail.until <= now) {
          delete jailDB.jailed[me];
          saveJail(jailDB);

          return sock.sendMessage(remoteJid, {
            text: '✅ No estás arrestado.'
          }, { quoted: msg });
        }

        const options = await getJailOptions(jailDB, me);
        const userData = await db.getUser(me);
        const xp = Number(userData.xp || 0);
        const option = (args?.[0] || '').toLowerCase();

        if (options.remainingAttempts <= 0) {
          saveJail(jailDB);

          return sock.sendMessage(remoteJid, {
            text:
`❌ *YA NO PUEDES SOBORNAR*

Agotaste tus *${MAX_SOBORNO_INTENTOS} intentos* de soborno.

⛓️ Tiempo restante: *${msToTime(jail.until - now)}*
☠️ Fama criminal: *${options.fame}*

💰 Fianza segura: *${options.fianzaCost} XP*
➤ Usa: *.fianza pagar*

🔑 Llaves disponibles: *${options.keys}*
➤ Usa: *.usar llave*`
          }, { quoted: msg });
        }

        if (!['pagar', 'pay', 'si', 'sí', 'confirmar'].includes(option)) {
          saveJail(jailDB);

          return sock.sendMessage(remoteJid, {
            text:
`💸 *SOBORNO DISPONIBLE*

⛓️ Tiempo restante: *${msToTime(jail.until - now)}*
☠️ Fama criminal: *${options.fame}*

🎲 Intentos restantes: *${options.remainingAttempts}/${MAX_SOBORNO_INTENTOS}*
💰 Costo actual: *${options.sobornoCost} XP*
⭐ Tu XP actual: *${xp} XP*

✅ Si funciona: sales de prisión.
❌ Si falla: pierdes el XP, se suman *5 minutos* y el siguiente soborno será más caro.

Para intentar sobornar:
*.sobornar pagar*

También puedes usar:
*.fianza pagar* — *${options.fianzaCost} XP*
*.usar llave* — tienes *${options.keys}* llave(s)`
          }, { quoted: msg });
        }

        if (xp < options.sobornoCost) {
          return sock.sendMessage(remoteJid, {
            text:
`❌ No tienes suficiente XP para intentar sobornar.

💸 Soborno actual: *${options.sobornoCost} XP*
⭐ Tu XP actual: *${xp} XP*
📌 Te faltan: *${options.sobornoCost - xp} XP*

Otras opciones:
💰 *.fianza pagar* — *${options.fianzaCost} XP*
🔑 *.usar llave* — tienes *${options.keys}* llave(s)`
          }, { quoted: msg });
        }

        await db.removeXP(me, options.sobornoCost);

        const chance = Math.max(0.20, 0.45 - (options.attempts * 0.10));
        const success = Math.random() < chance;

        if (success) {
          delete jailDB.jailed[me];
          jailDB.fame[me] = Math.max(0, Number(jailDB.fame[me] || 0) - 5);
          jailDB.lastCrimeAt[me] = Date.now();

          saveJail(jailDB);

          return sock.sendMessage(remoteJid, {
            text:
`💸 *SOBORNO EXITOSO*

Pagaste *${options.sobornoCost} XP*.

🚓 La policía aceptó el dinero.
✅ Quedaste libre antes de tiempo.
☠️ Tu fama criminal bajó un poco.`
          }, { quoted: msg });
        }

        jail.sobornoAttempts = Number(jail.sobornoAttempts || 0) + 1;
        jail.until += PENALIDAD_SOBORNO;
        addFame(jailDB, me, 3);

        const newOptions = await getJailOptions(jailDB, me);

        saveJail(jailDB);

        return sock.sendMessage(remoteJid, {
          text:
`❌ *SOBORNO FALLIDO*

Pagaste *${options.sobornoCost} XP*, pero el policía rechazó el trato.

⛓️ Penalidad: *+5 minutos de cárcel*
☠️ Tu fama criminal aumentó.

⏳ Tiempo restante: *${msToTime(jail.until - now)}*

💸 *Próximo soborno*
➤ Intentos restantes: *${newOptions.remainingAttempts}/${MAX_SOBORNO_INTENTOS}*
➤ Nuevo costo: *${newOptions.remainingAttempts > 0 ? `${newOptions.sobornoCost} XP` : 'Sin intentos'}*

💰 Fianza segura: *${newOptions.fianzaCost} XP*
➤ Usa: *.fianza pagar*

🔑 Llaves disponibles: *${newOptions.keys}*
➤ Usa: *.usar llave*`
        }, { quoted: msg });
      }

      const robosDB = loadRobos();
      const robos = robosDB[remoteJid] || [];
      const mentioned = cleanJid(getMentioned(msg)[0]);

      let suspects = robos.filter(r =>
        !r.caught &&
        now - Number(r.time || 0) <= ROB_TIME
      );

      if (mentioned) {
        suspects = suspects.filter(r => cleanJid(r.thief) === mentioned);
      }

      const oldRobos = robos.filter(r =>
        !r.caught &&
        now - Number(r.time || 0) > ROB_TIME
      );

      if (!suspects.length) {
        if (mentioned) {
          return sock.sendMessage(remoteJid, {
            text:
`🚓 *SIN PRUEBAS*

${tag(mentioned, store, groupMetadata)} no tiene robos recientes o ya escapó.`,
            mentions: [mentioned]
          }, { quoted: msg });
        }

        if (oldRobos.length) {
          const escapedMentions = [...new Set(oldRobos.map(r => cleanJid(r.thief)))];

          robosDB[remoteJid] = robos.filter(r =>
            now - Number(r.time || 0) <= 10 * 60 * 1000
          );

          saveRobos(robosDB);

          return sock.sendMessage(remoteJid, {
            text:
`🚓 *LA POLICÍA LLEGÓ TARDE*

Los sospechosos ya escaparon:

${escapedMentions.map(j => `➤ ${tag(j, store, groupMetadata)}`).join('\n')}`,
            mentions: escapedMentions
          }, { quoted: msg });
        }

        return sock.sendMessage(remoteJid, {
          text: '✅ No hay robos recientes en los últimos 5 minutos.'
        }, { quoted: msg });
      }

      const captured = [];
      const escaped = [];

      for (const robbery of suspects) {
        const thief = cleanJid(robbery.thief);

        applyFameDecay(jailDB, thief);

        const fame = jailDB.fame[thief] || 0;
        const captureChance = Math.min(0.85, 0.55 + fame / 200);

        if (Math.random() < captureChance) {
          captured.push(robbery);

          jailDB.jailed[thief] = {
            until: now + JAIL_TIME,
            by: me,
            chat: remoteJid,
            at: now,
            sobornoAttempts: 0
          };

          addFame(jailDB, thief, 10);
          robbery.caught = true;
        } else {
          escaped.push(robbery);
          addFame(jailDB, thief, 5);
        }
      }

      ro
