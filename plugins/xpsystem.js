'use strict';

const db = require('../lib/database');

// ===============================
// ⏱️ COOLDOWN
// ===============================
const cooldown = new Map();
const keyGen = (g, u) => `${g}:${u}`;

// ===============================
function randomXP() {
    return Math.floor(Math.random() * 10) + 5;
}

// ===============================
module.exports = {

    onMessage: async (ctx) => {

        const {
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

        // ===============================
        // 🔥 USAR TU DB REAL
        // ===============================
        const user = await db.getUser(sender);

        const gain = randomXP();

        user.xp = (user.xp || 0) + gain;

        const level = user.level || 1;
        const need = level * 1000;

        // ===============================
        // 📈 LEVEL UP
        // ===============================
        if (user.xp >= need) {
            user.level = level + 1;
            user.xp -= need;

            await db.saveUser(sender, user).catch(() => {});

            return reply(
                `🎉 @${sender.split('@')[0]} subió a nivel *${user.level}*`
            );
        }

        await db.saveUser(sender, user).catch(() => {});
    },

    // ===============================
    // 🏆 LEADERBOARD (GRUPO + GLOBAL)
    // ===============================
    commands: ['topxp', 'topglobal'],

    execute: async (ctx) => {

        const { sock, remoteJid, command } = ctx;

        const allUsers = await db.getAllUsers(); 
        // ⚠️ IMPORTANTE: necesitas esta función en tu db

        // ===============================
        // 🏆 TOP GRUPO
        // ===============================
        if (command === 'topxp') {

            const groupUsers = allUsers.filter(u =>
                u.id?.includes(remoteJid)
            );

            const top = groupUsers
                .sort((a, b) => (b.xp || 0) - (a.xp || 0))
                .slice(0, 10);

            let text = `🏆 *TOP XP DEL GRUPO*\n\n`;
            let mentions = [];

            for (let i = 0; i < top.length; i++) {

                const id = top[i].id;
                const xp = top[i].xp || 0;
                const level = top[i].level || 1;

                mentions.push(id);

                text += `#${i + 1}\n👤 @${id.split('@')[0]}\n⭐ Nivel: ${level}\n⚡ XP: ${xp}\n\n`;
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

            const top = allUsers
                .sort((a, b) => (b.xp || 0) - (a.xp || 0))
                .slice(0, 10);

            let text = `🌍 *TOP GLOBAL XP*\n\n`;
            let mentions = [];

            for (let i = 0; i < top.length; i++) {

                const id = top[i].id;
                const xp = top[i].xp || 0;
                const level = top[i].level || 1;

                mentions.push(id);

                text += `#${i + 1}\n👤 @${id.split('@')[0]}\n⭐ Nivel: ${level}\n⚡ XP: ${xp}\n\n`;
            }

            return sock.sendMessage(remoteJid, {
                text,
                mentions
            });
        }
    }
};
