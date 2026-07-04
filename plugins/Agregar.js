'use strict';

// ==========================================
// LÓGICA DE DETECCIÓN DE ADMIN (Copiada del plugin que sí funciona)
// ==========================================
function isAdminParticipant(participant = {}) {
    return (
        participant?.admin === 'admin' ||
        participant?.admin === 'superadmin' ||
        participant?.isAdmin === true
    );
}

async function isBotAdmin(sock, remoteJid) {
    try {
        const metadata = await sock.groupMetadata(remoteJid);
        const botRaw = sock.user?.id || sock.user?.jid || '';
        const botJid = botRaw.split(':')[0].split('@')[0];
        
        const bot = metadata.participants.find(p => {
            const pJid = p.id.split(':')[0].split('@')[0];
            return pJid === botJid;
        });

        // Debug para saber por qué falla (revisa la consola de tu bot)
        if (!bot) console.log("DEBUG: No encontré al bot en la lista de participantes.");
        else if (!isAdminParticipant(bot)) console.log("DEBUG: El bot existe pero 'isAdmin' es falso.");

        return isAdminParticipant(bot);
    } catch (e) {
        console.log("DEBUG: Error al consultar metadata:", e);
        return false;
    }
}

async function isUserAdmin(sock, remoteJid, senderJid) {
    try {
        const metadata = await sock.groupMetadata(remoteJid);
        const userJid = senderJid.split(':')[0].split('@')[0];
        const participant = metadata.participants.find(p => p.id.split(':')[0].split('@')[0] === userJid);
        return isAdminParticipant(participant);
    } catch {
        return false;
    }
}

// ==========================================
// COMANDO AGREGAR
// ==========================================
module.exports = {
    commands: ['add', 'agregar', 'añadir'],
    
    execute: async (ctx) => {
        const { sock, remoteJid, msg, sender, args, fromGroup, isOwner } = ctx;

        if (!fromGroup) {
            return sock.sendMessage(remoteJid, { text: '❌ Solo funciona en grupos.' }, { quoted: msg });
        }

        // 🔥 Verificación en tiempo real (evita el fallo de caché) 🔥
        const botIsAdmin = await isBotAdmin(sock, remoteJid);
        const userIsAdmin = await isUserAdmin(sock, remoteJid, sender);

        if (!userIsAdmin && !isOwner) {
            return sock.sendMessage(remoteJid, { text: '❌ Necesitas ser Admin o Owner.' }, { quoted: msg });
        }

        if (!botIsAdmin) {
            return sock.sendMessage(remoteJid, { text: '❌ Necesito ser administrador del grupo para agregar personas.' }, { quoted: msg });
        }

        const targetNumber = args.join('').replace(/\D/g, '');

        if (!targetNumber || targetNumber.length < 10) {
            return sock.sendMessage(remoteJid, { text: '❌ Número inválido. Ejemplo: .add 5215512345678' }, { quoted: msg });
        }

        const targetJid = `${targetNumber}@s.whatsapp.net`;

        try {
            await sock.groupParticipantsUpdate(remoteJid, [targetJid], 'add');
            await sock.sendMessage(remoteJid, { text: `✅ Agregado: @${targetNumber}`, mentions: [targetJid] }, { quoted: msg });
        } catch (error) {
            await sock.sendMessage(remoteJid, { text: `❌ Error al agregar (¿Privacidad cerrada o número incorrecto?).`, mentions: [targetJid] }, { quoted: msg });
        }
    }
};
