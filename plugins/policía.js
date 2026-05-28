'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const TEMP_DIR = path.join(process.cwd(), 'temp');
const JAIL_PATH = path.join(process.cwd(), 'lib', 'jail.json');
const ROBOS_PATH = path.join(process.cwd(), 'lib', 'robos_recientes.json');
const NICKS_PATH = path.join(process.cwd(), 'lib', 'fakeig_nicks.json');
const DEFAULT_PROFILE = path.join(process.cwd(), 'assets', 'Sinperfil.jpg');

const JAIL_TIME = 10 * 60 * 1000;
const ROB_TIME = 5 * 60 * 1000;

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
  ensureFile(JAIL_PATH, { jailed: {}, fame: {} });

  try {
    return JSON.parse(fs.readFileSync(JAIL_PATH, 'utf8') || '{}');
  } catch {
    return { jailed: {}, fame: {} };
  }
}

function saveJail(data) {
  ensureFile(JAIL_PATH, { jailed: {}, fame: {} });
  fs.writeFileSync(JAIL_PATH, JSON.stringify(data, null, 2));
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

    // Oscurecer foto
    '-fill', 'rgba(0,0,0,0.28)',
    '-draw', 'rectangle 0,0 720,720',

    // Rejas verticales con efecto metálico
    '-fill', 'rgba(18,18,18,0.92)',
    '-draw', 'rectangle 72,0 108,720',
    '-draw', 'rectangle 218,0 254,720',
    '-draw', 'rectangle 364,0 400,720',
    '-draw', 'rectangle 510,0 546,720',
    '-draw', 'rectangle 656,0 692,720',

    // Brillo izquierdo de cada barra
    '-fill', 'rgba(255,255,255,0.32)',
    '-draw', 'rectangle 78,0 86,720',
    '-draw', 'rectangle 224,0 232,720',
    '-draw', 'rectangle 370,0 378,720',
    '-draw', 'rectangle 516,0 524,720',
    '-draw', 'rectangle 662,0 670,720',

    // Sombra derecha de cada barra
    '-fill', 'rgba(0,0,0,0.55)',
    '-draw', 'rectangle 98,0 108,720',
    '-draw', 'rectangle 244,0 254,720',
    '-draw', 'rectangle 390,0 400,720',
    '-draw', 'rectangle 536,0 546,720',
    '-draw', 'rectangle 682,0 692,720',

    // Rejas horizontales con efecto metálico
    '-fill', 'rgba(18,18,18,0.92)',
    '-draw', 'rectangle 0,138 720,170',
    '-draw', 'rectangle 0,350 720,382',
    '-draw', 'rectangle 0,562 720,594',

    // Brillo superior horizontal
    '-fill', 'rgba(255,255,255,0.28)',
    '-draw', 'rectangle 0,142 720,149',
    '-draw', 'rectangle 0,354 720,361',
    '-draw', 'rectangle 0,566 720,573',

    // Sombra inferior horizontal
    '-fill', 'rgba(0,0,0,0.55)',
    '-draw', 'rectangle 0,162 720,170',
    '-draw', 'rectangle 0,374 720,382',
    '-draw', 'rectangle 0,586 720,594',

    // Sombras en cruces de rejas
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

    // Candado abajo izquierda
    '-fill', 'rgba(45,45,45,0.95)',
    '-stroke', 'rgba(180,180,180,0.75)',
    '-strokewidth', '4',
    '-draw', 'roundrectangle 42,510 182,660 10,10',

    '-fill', 'none',
    '-stroke', 'rgba(180,180,180,0.85)',
    '-strokewidth', '12',
    '-draw', 'arc 75,445 150,555 200,140',

    '-fill', 'rgba(0,0,0,0.75)',
    '-stroke', 'none',
    '-draw', 'circle 112,580 126,580',
    '-draw', 'rectangle 106,580 118,620',

    // Cinta roja
    '-fill', 'rgba(185,0,0,0.86)',
    '-draw', 'rectangle 0,292 720,420',

    // Bordes de cinta
    '-fill', 'rgba(255,255,255,0.18)',
    '-draw', 'rectangle 0,292 720,302',
    '-fill', 'rgba(0,0,0,0.30)',
    '-draw', 'rectangle 0,410 720,420',

    // Texto ARRESTADO
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
  commands: ['policia', 'policía', 'denunciar', 'carcel', 'fama', 'sobornar'],

  async execute({ sock, remoteJid, msg, sender, command, store, groupMetadata }) {
    let collagePath = null;

    try {
      const now = Date.now();
      const me = cleanJid(sender);

      const jailDB = loadJail();
      jailDB.jailed = jailDB.jailed || {};
      jailDB.fame = jailDB.fame || {};

      if (command === 'carcel') {
        const jail = jailDB.jailed[me];

        if (!jail || jail.until <= now) {
          delete jailDB.jailed[me];
          saveJail(jailDB);

          return sock.sendMessage(remoteJid, {
            text: '✅ No estás arrestado.'
          }, { quoted: msg });
        }

        return sock.sendMessage(remoteJid, {
          text:
`⛓️ *ESTÁS ARRESTADO*

⏳ Tiempo restante: *${msToTime(jail.until - now)}*
💸 Usa *.sobornar* para intentar salir antes.`
        }, { quoted: msg });
      }

      if (command === 'fama') {
        const fame = jailDB.fame[me] || 0;

        return sock.sendMessage(remoteJid, {
          text:
`☠️ *FAMA CRIMINAL*

👤 ${tag(me, store, groupMetadata)}
🔥 Nivel criminal: *${fame}*
🚨 Riesgo policial: *${Math.min(90, 10 + fame)}%*`,
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

        const success = Math.random() < 0.45;

        if (success) {
          delete jailDB.jailed[me];
          jailDB.fame[me] = Math.max(0, (jailDB.fame[me] || 0) - 5);
          saveJail(jailDB);

          return sock.sendMessage(remoteJid, {
            text:
`💸 *SOBORNO EXITOSO*

🚓 La policía aceptó el dinero.
✅ Quedaste libre antes de tiempo.`
          }, { quoted: msg });
        }

        jail.until += 2 * 60 * 1000;
        jailDB.fame[me] = (jailDB.fame[me] || 0) + 3;
        saveJail(jailDB);

        return sock.sendMessage(remoteJid, {
          text:
`❌ *SOBORNO FALLIDO*

👮 El policía rechazó el dinero.
⛓️ Tu condena aumentó *2 minutos*.

⏳ Tiempo restante: *${msToTime(jail.until - now)}*`
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

        const fame = jailDB.fame[thief] || 0;
        const captureChance = Math.min(0.85, 0.55 + fame / 200);

        if (Math.random() < captureChance) {
          captured.push(robbery);

          jailDB.jailed[thief] = {
            until: now + JAIL_TIME,
            by: me,
            chat: remoteJid,
            at: now
          };

          jailDB.fame[thief] = (jailDB.fame[thief] || 0) + 10;
          robbery.caught = true;
        } else {
          escaped.push(robbery);
          jailDB.fame[thief] = (jailDB.fame[thief] || 0) + 5;
        }
      }

      robosDB[remoteJid] = robos.filter(r =>
        now - Number(r.time || 0) <= 10 * 60 * 1000
      );

      saveRobos(robosDB);
      saveJail(jailDB);

      const mentions = [
        ...captured.map(r => cleanJid(r.thief)),
        ...captured.map(r => cleanJid(r.victim)),
        ...escaped.map(r => cleanJid(r.thief)),
        ...escaped.map(r => cleanJid(r.victim)),
        me
      ];

      let text = `🚔 *OPERATIVO POLICIAL*\n\n`;

      if (captured.length) {
        text += `⛓️ *Arrestados:*\n`;

        for (const r of captured) {
          text += `➤ ${tag(r.thief, store, groupMetadata)} fue arrestado por robar *${r.amount} XP* a ${tag(r.victim, store, groupMetadata)}\n`;
        }

        text += `\n📌 Condena: *10 minutos en prisión*\n`;
        text += `💸 Pueden usar *.sobornar* para intentar salir.\n\n`;
      }

      if (escaped.length) {
        text += `🚓 *Escaparon:*\n`;

        for (const r of escaped) {
          text += `➤ ${tag(r.thief, store, groupMetadata)} escapó con *${r.amount} XP* robados a ${tag(r.victim, store, groupMetadata)}\n`;
        }

        text += `\n☠️ Su fama criminal aumentó.\n\n`;
      }

      if (captured.length) {
        const id = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;
        collagePath = path.join(TEMP_DIR, `police_collage_${id}.jpg`);

        await makeArrestCollage(sock, captured, collagePath);

        return sock.sendMessage(remoteJid, {
          image: fs.readFileSync(collagePath),
          caption: text,
          mentions
        }, { quoted: msg });
      }

      return sock.sendMessage(remoteJid, {
        text,
        mentions
      }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error policia:', err?.message || err);

      return sock.sendMessage(remoteJid, {
        text: '❌ Error usando el sistema policial.'
      }, { quoted: msg });
    } finally {
      try {
        if (collagePath && fs.existsSync(collagePath)) {
          fs.unlinkSync(collagePath);
        }
      } catch {}
    }
  }
};
