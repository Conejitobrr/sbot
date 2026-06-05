'use strict';

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../xp.json');

if (!fs.existsSync(dbPath)) {
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

// ===============================
// 🔥 ESTE ES EL FORMATO CORRECTO
// ===============================
module.exports = {
    onMessage: async (m, { conn }) => {

        if (!m.isGroup) return;

        const user = m.sender;
        const group = m.chat;

        let db = loadDB();

        if (!db[group]) db[group] = {};
        if (!db[group][user]) {
            db[group][user] = { xp: 0, level: 1 };
        }

        let gain = randomXP();
        db[group][user].xp += gain;

        let need = db[group][user].level * 100;

        if (db[group][user].xp >= need) {
            db[group][user].level++;
            db[group][user].xp -= need;

            await conn.sendMessage(group, {
                text: `🎉 @${user.split('@')[0]} subió a nivel *${db[group][user].level}*`,
                mentions: [user]
            });
        }

        saveDB(db);
    },

    execute: async (m, { conn, command }) => {

        if (command !== 'topxp') return;

        let group = m.chat;

        let db = loadDB();
        let data = db[group] || {};

        let top = Object.entries(data)
            .sort((a, b) => (b[1].level * 100 + b[1].xp) - (a[1].level * 100 + a[1].xp))
            .slice(0, 10);

        let text = `🏆 *TOP XP DEL GRUPO*\n\n`;

        for (let i = 0; i < top.length; i++) {
            let id = top[i][0];
            let d = top[i][1];

            text += `#${i + 1}\n👤 @${id.split('@')[0]}\n⭐ Nivel: ${d.level}\n⚡ XP: ${d.xp}\n\n`;
        }

        return conn.sendMessage(group, {
            text,
            mentions: top.map(u => u[0])
        });
    }
};
