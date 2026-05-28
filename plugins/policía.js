'use strict';

const fs = require('fs');
const path = require('path');

const JAIL_PATH = path.join(process.cwd(), 'lib', 'jail.json');
const ROBOS_PATH = path.join(process.cwd(), 'lib', 'robos_recientes.json');

const JAIL_TIME = 10 * 60 * 1000;
const ROB_TIME = 5 * 60 * 1000;

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

function msToTime(ms = 0) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m} min ${s} seg`;
}

module.exports = {
  commands: ['policia', 'denunciar', 'carcel', 'fama', 'sobornar'],

  async execute({ sock, remoteJid, msg, sender, command }) {
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

👤 @${number(me)}
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

@${number(mentioned)} no tiene robos recientes o ya escapó.`,
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

${escapedMentions.map(j => `➤ @${number(j)}`).join('\n')}`,
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
        ...escaped.map(r => cleanJid(r.thief)),
        me
      ];

      let text = `🚔 *OPERATIVO POLICIAL*\n\n`;

      if (captured.length) {
        text += `⛓️ *Arrestados:*\n`;

        for (const r of captured) {
          text += `➤ @${number(r.thief)} por robar *${r.amount} XP* a @${number(r.victim)}\n`;
        }

        text += `\n📌 Condena: *10 minutos en prisión*\n`;
        text += `💸 Pueden usar *.sobornar* para intentar salir.\n\n`;
      }

      if (escaped.length) {
        text += `🚓 *Escaparon:*\n`;

        for (const r of escaped) {
          text += `➤ @${number(r.thief)} escapó con *${r.amount} XP*\n`;
        }

        text += `\n☠️ Su fama criminal aumentó.\n\n`;
      }

      if (!captured.length && !escaped.length) {
        text += '✅ No se encontró a ningún sospechoso.';
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
    }
  }
};
