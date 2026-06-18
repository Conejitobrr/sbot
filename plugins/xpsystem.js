'use strict';

const db = require('../lib/database');

const cooldown = new Map();

function key(g, u) {
    return `${g}:${u}`;
}

function randomXP() {
    return Math.floor(Math.random() * 10) + 5;
}

// Función auxiliar para asegurar que el ID coincida con la base de datos
function cleanNumber(jid = '') {
    return String(jid).split('@')[0].split(':')[0].replace(/\D/g, '');
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

        // 🔄 IGNORAMOS EL NIVEL GUARDADO Y FORZAMOS EL RECÁLCULO NUEVO
        const list = Object.entries(users).map(([id, u]) => ({
            id,
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

            // Obtenemos los JIDs y buscamos su equivalente limpio en la DB
            const participants = metadata.participants.map(p => p.id);

            const groupUsers = participants
                .map(id => {
                    const cleanId = cleanNumber(id);
                    return { id, cleanId };
                })
                .filter(p => users[p.cleanId])
                .map(p => ({
                    id: p.id,
                    xp: users[p.cleanId].xp || 0,
                    // Forzamos recálculo aquí también
                    level: db.calculateLevel(users[p.cleanId].xp || 0) 
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

                text += `${medal} @${cleanNumber(u.id)}\n⭐ Nivel: ${u.level}\n⚡ XP: ${u.xp}\n\n`;
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
                // Restauramos el formato jid para mencionarlo correctamente en el top global
                const jid = u.id.includes('@') ? u.id : `${u.id}@s.whatsapp.net`;
                mentions.push(jid);

                const medal = ['🥇','🥈','🥉'][i] || `${i + 1}.`;

                text += `${medal} @${cleanNumber(u.id)}\n⭐ Nivel: ${u.level}\n⚡ XP: ${u.xp}\n\n`;
            }

            return sock.sendMessage(remoteJid, {
                text,
                mentions
            }, { quoted: ctx.msg });
        }
    }
};
