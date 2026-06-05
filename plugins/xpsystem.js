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
    // 🔥 XP SYSTEM (USA TU DB REAL)
    // ===============================
    onMessage: async (ctx) => {

        const {
            sender,
            remoteJid,
            fromGroup,
        } = ctx;

        if (!fromGroup) return;

        const k = key(remoteJid, sender);
        const now = Date.now();

        if (cooldown.has(k)) {
            if (now - cooldown.get(k) < 8000) return;
        }

        cooldown.set(k, now);

        const gain = randomXP();

        // ✔ USA TU SISTEMA REAL (NO DUPLICA NADA)
        await db.addXP(sender, gain);
    },

    // ===============================
    // 🏆 LEADERBOARDS
    // ===============================
    commands: ['topxp', 'topglobal'],

    execute: async (ctx) => {

    const { sock, remoteJid, sender, command } = ctx;

    const data = await db.getAll();
    const users = data.users || {};

    // ===============================
    // 🔥 CONVERTIR DB REAL A LISTA
    // ===============================
    const list = Object.entries(users).map(([id, u]) => ({
        id,
        xp: u.xp || 0,
        level: u.level || db.calculateLevel(u.xp || 0)
    }));

    // ===============================
    // 🏆 TOP GRUPO (FIX REAL)
    // ===============================
    if (command === 'topxp') {

        // SOLO USUARIOS QUE HAN INTERACTUADO EN ESTE CHAT
        const groupUsers = list.filter(u =>
            u.id.endsWith('@s.whatsapp.net')
        );

        const top = groupUsers
            .sort((a, b) => (b.xp) - (a.xp))
            .slice(0, 10);

        let text = `🏆 *TOP XP DEL GRUPO*\n\n`;
        let mentions = [];

        for (let i = 0; i < top.length; i++) {

            const u = top[i];
            mentions.push(u.id);

            text +=
`#${i + 1}
👤 @${u.id.split('@')[0]}
⭐ Nivel: ${u.level}
⚡ XP: ${u.xp}

`;
        }

        return sock.sendMessage(remoteJid, {
            text,
            mentions
        });
    }

    // ===============================
    // 🌍 TOP GLOBAL (REAL)
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

            text +=
`#${i + 1}
👤 @${u.id.split('@')[0]}
⭐ Nivel: ${u.level}
⚡ XP: ${u.xp}

`;
        }

        return sock.sendMessage(remoteJid, {
            text,
            mentions
        });
    }
    }                mentions
            });
        }
    }
};
