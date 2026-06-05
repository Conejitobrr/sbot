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

    onMessage: async (ctx) => {

        const {
            sender,
            remoteJid,
            fromGroup,
            reply
        } = ctx;

        if (!fromGroup) return;

        const k = key(remoteJid, sender);
        const now = Date.now();

        if (cooldown.has(k)) {
            if (now - cooldown.get(k) < 8000) return;
        }

        cooldown.set(k, now);

        await db.addXP(sender, randomXP());
    },

    commands: ['topxp', 'topglobal'],

    execute: async (ctx) => {

        const { sock, remoteJid, command } = ctx;

        const data = await db.getAll();
        const users = data.users || {};

        const list = Object.entries(users).map(([id, u]) => ({
            id,
            xp: u.xp || 0,
            level: u.level || 1
        }));

        // ===============================
        // 🏆 TOP GRUPO
        // ===============================
        if (command === 'topxp') {

            const top = list
                .filter(u => u.id.endsWith('@s.whatsapp.net'))
                .sort((a, b) => b.xp - a.xp)
                .slice(0, 10);

            let text = `🏆 *TOP XP DEL GRUPO*\n\n`;
            let mentions = [];

            for (let i = 0; i < top.length; i++) {

                const u = top[i];

                mentions.push(u.id);

                text += `#${i + 1}\n👤 @${u.id.split('@')[0]}\n⭐ Nivel: ${u.level}\n⚡ XP: ${u.xp}\n\n`;
            }

            return sock.sendMessage(remoteJid, {
                text: text,
                mentions: mentions
            });
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

                text += `#${i + 1}\n👤 @${u.id.split('@')[0]}\n⭐ Nivel: ${u.level}\n⚡ XP: ${u.xp}\n\n`;
            }

            return sock.sendMessage(remoteJid, {
                text: text,
                mentions: mentions
            });
        }
    }
};
