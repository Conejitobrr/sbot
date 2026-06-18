'use strict';

const db = require('../lib/database');

const cooldown = new Map();

function key(g, u) {
    return `${g}:${u}`;
}

function randomXP() {
    return Math.floor(Math.random() * 10) + 5;
}

// Limpiamos solo el código de dispositivo para evitar errores, pero conservamos @s.whatsapp.net
function cleanJid(jid = '') {
    return String(jid).split(':')[0];
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

        if (cooldown.has(k) && (now - cooldown.get(k) < 8000)) return;

        cooldown.set(k, now);

        await db.addXP(sender, randomXP());
    },

    // ===============================
    // 🏆 COMANDOS
    // ===============================
    commands: ['topxp', 'topglobal'],

    execute: async (ctx) => {

        const { sock, remoteJid, command } = ctx;

        const data = await db.getAll();
        const users = data.users || {};

        // 🔄 IGNORAMOS EL NIVEL GUARDADO Y FORZAMOS EL RECÁLCULO NUEVO PARA EL GLOBAL
        const list = Object.entries(users).map(([id, u]) => ({
            id: cleanJid(id),
            xp: u.xp || 0,
            level: db.calculateLevel(u.xp || 0)
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
                });
            }

            // Obtenemos los JIDs reales de los miembros actuales
            const participants = metadata.participants.map(p => cleanJid(p.id));

            const groupUsers = participants
                .filter(id => users[id]) // Buscamos su ID exacto en la DB
                .map(id => ({
                    id,
                    xp: users[id].xp || 0,
                    // Forzamos el recálculo aquí también
                    level: db.calculateLevel(users[id].xp || 0) 
                }));

            if (!groupUsers.length) {
                return sock.sendMessage(remoteJid, {
                    text: '❌ Nadie en este grupo tiene XP aún'
                });
            }

            const top = groupUsers
                .sort((a, b) => b.xp - a.xp)
                .slice(0, 10);

            let text = `🏆 *TOP XP DEL GRUPO*\n\n`;
            let mentions = [];

            for (let i = 0; i < top.length; i++) {

                const u = top[i];
                mentions.push(u.id);

                const medal = ['🥇','🥈','🥉'][i] || `${i + 1}.`;

                text += `${medal} @${u.id.split('@')[0]}\n⭐ Nivel: ${u.level}\n⚡ XP: ${u.xp}\n\n`;
            }

            return sock.sendMessage(remoteJid, {
                text,
                mentions
            }, { quoted: ctx.msg });
        }

        // ===============================
        // 🌍 TOP GLOBAL REAL
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

                const medal = ['🥇','🥈','🥉'][i] || `${i + 1}.`;

                text += `${medal} @${u.id.split('@')[0]}\n⭐ Nivel: ${u.level}\n⚡ XP: ${u.xp}\n\n`;
            }

            return sock.sendMessage(remoteJid, {
                text,
                mentions
            }, { quoted: ctx.msg });
        }
    }
};
