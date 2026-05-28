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

    '-fill', 'rgba(0,0,0,0.35)',
    '-draw', 'rectangle 0,0 720,720',

    // Rejas verticales
    '-fill', 'rgba(20,20,20,0.65)',
    '-draw', 'rectangle 80,0 110,720',
    '-draw', 'rectangle 230,0 260,720',
    '-draw', 'rectangle 380,0 410,720',
    '-draw', 'rectangle 530,0 560,720',
    '-draw', 'rectangle 680,0 710,720',

    // Rejas horizontales
    '-draw', 'rectangle 0,150 720,175',
    '-draw', 'rectangle 0,360 720,385',
    '-draw', 'rectangle 0,570 720,595',

    // Cinta roja
    '-fill', 'rgba(180,0,0,0.88)',
    '-draw', 'rectangle 0,295 720,420',

    '-fill', '#ffffff',
    '-stroke', '#000000',
    '-strokewidth', '3',
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
