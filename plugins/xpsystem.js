'use strict';

const db = require('../lib/database');

const cooldown = new Map();

function key(g, u) {
    return `${g}:${u}`;
}

function randomXP() {
    return Math.floor(Math.random() * 10) + 5;
}

module.exports = {

    // ===============================
    // 🔥 XP SYSTEM
    // ===============================
    onMessage: async (ctx) => {

        const { sender, remoteJid, fromGroup } = ctx;

        if (!fromGroup) return;

        const k = key(remoteJid, sender);
        const now = Date.now();

        if (cooldown.has(k)) {
            if (now - cooldown.get(k) < 8000) return;
        }

        cooldown.set(k, now);

        const gain = randomXP();

        await db.addXP(sender, gain);
    },

    // ===============================
    // 🏆 COMANDOS
    // ===============================
    commands: ['topxp', 'topglobal'],

    execute: async (ctx) => {

        const { sock, remoteJid, command } = ctx;

        const data = await db.getAll();
        const users = data.users || {};

        // ===============================
        // 🌍 LISTA GLOBAL
        // ===============================
        const list = Object.entries(users).map(([id, u]) => ({
            id,
            xp: u.xp || 0,
            level: u.level || db.calculateLevel(u.xp || 0)
        }));

        // ===============================
        // 🏆 TOP GRUPO REAL
        // ===============================
        if (command === 'topxp') {

    let metadata;

    try {
        metadata = await sock.groupMetadata(remoteJid);
    } catch {
        return sock.sendMessage(remoteJid, {
            text: '❌ Este comando solo funciona en grupos'
        }, { quoted: ctx.msg });
    }

    const participants = metadata.participants.map(p => p.id);

    const data = await db.getAll();
    const users = data.users || {};

    // 🔥 SOLO USUARIOS QUE ESTÁN EN EL GRUPO Y TIENEN XP
    const groupUsers = participants
        .filter(id => users[id] && (users[id].xp || 0) > 0)
        .map(id => ({
            id,
            xp: users[id].xp || 0,
            level: users[id].level || db.calculateLevel(users[id].xp || 0)
        }));

    if (!groupUsers.length) {
        return sock.sendMessage(remoteJid, {
            text: '❌ Nadie en este grupo tiene XP aún'
        }, { quoted: ctx.msg });
    }

    const top = groupUsers
        .sort((a, b) => b.xp - a.xp)
        .slice(0, 10);

    let text = `🏆 *TOP XP DEL GRUPO*\n\n`;
    let mentions = [];

    for (let i = 0; i < top.length; i++) {

        const u = top[i];
        mentions.push(u.id);

        const medal = ['🥇','🥈','🥉'][i] || `#${i + 1}`;

        text +=
`${medal} @${u.id.split('@')[0]}
⭐ Nivel: ${u.level}
⚡ XP: ${u.xp}

`;
    }

    return sock.sendMessage(remoteJid, {
        text,
        mentions
    }, { quoted: ctx.msg });
        }

        // ===============================
        // 🌍 TOP GLOBAL
        // ===============================
        if (command === 'topglobal') {

            const top = list
                .sort((a, b) => b.xp - a.xp)
                .slice(0, 10);

            let text = `🌍 *TOP GLOBAL XP*\n\n`;
            let mentions = [];

            for (let i = 0; i < top.length; i++) {

                const u = top[i];
                mentions.push(u.id);

                const pos = ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;

                text += `${pos} @${u.id.split('@')[0]}\n⭐ Nivel: ${u.level}\n⚡ XP: ${u.xp}\n\n`;
            }

            return sock.sendMessage(remoteJid, {
                text,
                mentions
            }, { quoted: ctx.msg });
        }
    }
};
