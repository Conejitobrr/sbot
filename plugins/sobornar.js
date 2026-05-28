'use strict';

const fs = require('fs');
const path = require('path');

const JAIL_PATH = path.join(process.cwd(), 'lib', 'jail.json');

function cleanJid(jid = '') {
  return String(jid).split(':')[0];
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

function msToTime(ms = 0) {
  const total = Math.max(0, Math.floor(ms / 1000));

  const m = Math.floor(total / 60);
  const s = total % 60;

  return `${m} min ${s} seg`;
}

module.exports = {
  commands: ['sobornar'],

  async execute({
    sock,
    remoteJid,
    msg,
    sender
  }) {

    try {

      const db = loadDB();

      db.jailed = db.jailed || {};
      db.fame = db.fame || {};

      const clean = cleanJid(sender);

      const jail = db.jailed[clean];

      if (!jail) {
        return sock.sendMessage(remoteJid, {
          text: '✅ No estás arrestado.'
        }, { quoted: msg });
      }

      if (jail.until <= Date.now()) {

        delete db.jailed[clean];

        saveDB(db);

        return sock.sendMessage(remoteJid, {
          text: '✅ Tu condena ya terminó.'
        }, { quoted: msg });
      }

      const success = Math.random() < 0.45;

      if (success) {

        delete db.jailed[clean];

        db.fame[clean] = Math.max(
          0,
          (db.fame[clean] || 0) - 5
        );

        saveDB(db);

        return sock.sendMessage(remoteJid, {
          text:
`💸 *SOBORNO EXITOSO*

🚓 La policía aceptó el dinero.

✅ Fuiste liberado antes de tiempo.`
        }, { quoted: msg });
      }

      jail.until += 2 * 60 * 1000;

      db.fame[clean] = (db.fame[clean] || 0) + 3;

      saveDB(db);

      return sock.sendMessage(remoteJid, {
        text:
`❌ *SOBORNO FALLIDO*

👮 El policía rechazó el dinero.

⛓️ Tu condena aumentó *2 minutos*

⏳ Tiempo restante:
*${msToTime(jail.until - Date.now())}*`
      }, { quoted: msg });

    } catch (err) {

      console.log('❌ Error sobornar:', err?.message || err);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error usando soborno.'
      }, { quoted: msg });
    }
  }
};
