'use strict';

const fs = require('fs');
const path = require('path');

// 📁 archivo de base de datos simple
const dbPath = path.join(__dirname, '../database/xp.json');

// crear si no existe
if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({}));
}

// cargar datos
function loadDB() {
    return JSON.parse(fs.readFileSync(dbPath));
}

// guardar datos
function saveDB(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// generar XP aleatorio
function randomXP() {
    return Math.floor(Math.random() * 10) + 5; // 5 a 14 XP
}

module.exports = async (m, { conn, command, args }) => {

    const isGroup = m.isGroup;
    const sender = m.sender;
    const groupId = isGroup ? m.chat : null;

    if (!groupId) return;

    let db = loadDB();

    // crear grupo si no existe
    if (!db[groupId]) db[groupId] = {};

    // crear usuario si no existe
    if (!db[groupId][sender]) {
        db[groupId][sender] = { xp: 0, level: 1 };
    }

    // =========================
    // 🎯 GANAR XP AUTOMÁTICO
    // =========================
    const gain = randomXP();

    db[groupId][sender].xp += gain;

    // sistema de nivel simple
    const user = db[groupId][sender];
    const needed = user.level * 100;

    if (user.xp >= needed) {
        user.level += 1;
        user.xp = user.xp - needed;

        await conn.sendMessage(groupId, {
            text: `🎉 @${sender.split('@')[0]} subió a nivel *${user.level}*`,
            mentions: [sender]
        });
    }

    saveDB(db);

    // =========================
    // 📊 COMANDO: .topxp
    // =========================
    if (command === 'topxp') {

        let groupData = db[groupId];

        let top = Object.entries(groupData)
            .sort((a, b) => (b[1].xp + (b[1].level * 100)) - (a[1].xp + (a[1].level * 100)))
            .slice(0, 10);

        let text = `🏆 *TOP XP DEL GRUPO*\n\n`;

        for (let i = 0; i < top.length; i++) {
            let userId = top[i][0];
            let data = top[i][1];

            text += `#${i + 1}\n👤 @${userId.split('@')[0]}\n⭐ Nivel: ${data.level}\n⚡ XP: ${data.xp}\n\n`;
        }

        return conn.sendMessage(groupId, {
            text,
            mentions: top.map(u => u[0])
        });
    }
};
