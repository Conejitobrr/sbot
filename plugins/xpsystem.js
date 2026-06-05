'use strict';

const fs = require('fs');
const path = require('path');

const dbPath = path.join(process.cwd(), 'lib', 'xp.json');

if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.writeFileSync(dbPath, JSON.stringify({}));
}

function loadDB() {
    return JSON.parse(fs.readFileSync(dbPath));
}

function saveDB(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function randomXP() {
    return Math.floor(Math.random() * 10) + 5;
}

const cooldown = new Map();
const keyGen = (g, u) => `${g}:${u}`;

module.exports = {

    // ===============================
    // 🔥 ON MESSAGE (FIXED PARA TU HANDLER)
    // ===============================
    onMessage: async (ctx) => {

        const {
            sock,
            sender,
            remoteJid,
            fromGroup,
            reply
        } = ctx;

        if (!fromGroup) return;

        const key = keyGen(remoteJid, sender);
        const now = Date.now();

        if (cooldown.has(key)) {
            const last = cooldown.get(key);
            if (now - last < 8000) return;
        }

        cooldown.set(key, now);

        let db = loadDB();

        if (!db[remoteJid]) db[remoteJid] = {};
        if (!db.global) db.global = {};

        if (!db[remoteJid][sender]) {
            db[remoteJid][sender] = { xp: 0, level: 1 };
        }

        if (!db.global[sender]) {
            db.global[sender] = { xp: 0, level: 1 };
        }

        let gain = randomXP();

        // GROUP XP
        db[remoteJid][sender].xp += gain;

        let needGroup = db[remoteJid][sender].level * 120;

        if (db[remoteJid][sender].xp >= needGroup) {
            db[remoteJid][sender].level++;
            db[remoteJid][sender].xp -= needGroup;

            await reply(
                `🎉 @${sender.split('@')[0]} subió a nivel *${db[remoteJid][sender].level}*`
            );
        }

        // GLOBAL XP
        db.global[sender].xp += gain;

        let needGlobal = db.global[sender].level * 200;

        if (db.global[sender].xp >= needGlobal) {
            db.global[sender].level++;
            db.global[sender].xp -= needGlobal;

            await reply(
                `🌍 @${sender.split('@')[0]} subió a nivel GLOBAL *${db.global[sender].level}*`
            );
        }

        saveDB(db);
    },

    // ===============================
    // 🏆 COMMANDS (IMPORTANTE: TU LOADER NECESITA ESTO)
    // ===============================
    commands: ['topxp', 'topglobal', 'nivelglobal'],

    execute: async (ctx) => {

        const { sock, remoteJid, sender, command } = ctx;

        let db = loadDB();

        // ===============================
        // 🏆 TOP GRUPO
        // ===============================
        if (command === 'topxp') {

            let data = db[remoteJid] || {};

            let top = Object.entries(data)
                .sort((a, b) =>
                    (b[1].level * 100 + b[1].xp) -
                    (a[1].level * 100 + a[1].xp)
                )
                .slice(0, 10);

            let text = `🏆 *TOP XP DEL GRUPO*\n\n`;
            let mentions = [];

            for (let i = 0; i < top.length; i++) {
                let id = top[i][0];
                let d = top[i][1];

                mentions.push(id);

                text += `#${i + 1}\n👤 @${id.split('@')[0]}\n⭐ Nivel: ${d.level}\n⚡ XP: ${d.xp}\n\n`;
            }

            return sock.sendMessage(remoteJid, {
                text,
                mentions
            });
        }

        // ===============================
        // 🌍 TOP GLOBAL
        // ===============================
        if (command === 'topglobal') {

            let data = db.global || {};

            let top = Object.entries(data)
                .sort((a, b) =>
                    (b[1].level * 200 + b[1].xp) -
                    (a[1].level * 200 + a[1].xp)
                )
                .slice(0, 10);

            let text = `🌍 *TOP GLOBAL XP*\n\n`;
            let mentions = [];

            for (let i = 0; i < top.length; i++) {
                let id = top[i][0];
                let d = top[i][1];

                mentions.push(id);

                text += `#${i + 1}\n👤 @${id.split('@')[0]}\n⭐ Nivel: ${d.level}\n⚡ XP: ${d.xp}\n\n`;
            }

            return sock.sendMessage(remoteJid, {
                text,
                mentions
            });
        }

        // ===============================
        // 📊 TU NIVEL GLOBAL
        // ===============================
        if (command === 'nivelglobal') {

            let user = db.global?.[sender];

            if (!user) {
                return sock.sendMessage(remoteJid, {
                    text: '❌ No tienes nivel global aún.'
                });
            }

            return sock.sendMessage(remoteJid, {
                text:
`🌍 *TU NIVEL GLOBAL*

⭐ Nivel: ${user.level}
⚡ XP: ${user.xp}`,
                mentions: [sender]
            });
        }
    }
};
