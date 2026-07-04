'use strict';

// ==========================================
// FUNCIONES DE LIMPIEZA
// ==========================================
function cleanJid(jid = '') {
    const str = String(jid || '');
    if (!str) return '';
    const user = str.split(':')[0].split('@')[0];
    const domain = str.includes('@') ? str.split('@')[1] : 's.whatsapp.net';
    return `${user}@${domain}`;
}

function cleanNumber(num = '') {
    return num.replace(/\D/g, ''); // Deja solo los números
}

// ==========================================
// FUNCIONES EXTRAÍDAS DE TU PLUGIN FUNCIONAL
// ==========================================
function isAdminParticipant(participant = {}) {
    return (
        participant?.admin === 'admin' ||
        participant?.admin === 'superadmin' ||
        participant?.isAdmin === true
    );
}

// Función que pide la lista de admins en TIEMPO REAL
async function checkPermissions(sock, remoteJid, senderJid) {
    try {
        const metadata = await sock.groupMetadata(remoteJid);
        const participants = metadata.participants || [];

        // Buscamos al bot en la lista del grupo
        const botRaw = sock.user?.id || sock.user?.jid || '';
        const botJid = cleanJid(botRaw);
        const botParticipant = participants.find(p => cleanJid(p.id) === botJid);
        const isBotAdmin = isAdminParticipant(botParticipant);

        // Buscamos al usuario que envió el comando
        const userParticipant = participants.find(p => cleanJid(p.id) === cleanJid(senderJid));
        const isUserAdmin = isAdminParticipant(userParticipant);

        return { isBotAdmin, isUserAdmin };
    } catch (error) {
        console.error("Error obteniendo la metadata del grupo:", error);
        return { isBotAdmin: false, isUserAdmin: false };
    }
}

module.exports = {
    commands: ['add', 'agregar', 'añadir'],
    
    execute: async (ctx) => {
        const { sock, remoteJid, msg, sender, args, fromGroup, isOwner } = ctx;

        if (!fromGroup) {
            return sock.sendMessage(remoteJid, { text: '❌ Este comando solo funciona dentro de grupos.' }, { quoted: msg });
        }

        // 🔥 OBTENEMOS LOS PERMISOS REALES AL INSTANTE 🔥
        const { isBotAdmin, isUserAdmin } = await checkPermissions(sock, remoteJid, sender);

        // Verificamos si el que envió el comando es Admin O es el Owner (creador)
        if (!isUserAdmin && !isOwner) {
            return sock.sendMessage(remoteJid, { text: '❌ Solo los administradores del grupo o mi creador pueden usar este comando.' }, { quoted: msg });
        }

        // Verificamos si el Bot tiene permiso para añadir
        if (!isBotAdmin) {
            return sock.sendMessage(remoteJid, { text: '❌ Necesito ser administrador del grupo para poder agregar personas.' }, { quoted: msg });
        }

        const rawInput = args.join('');
        const targetNumber = cleanNumber(rawInput);

        if (!targetNumber || targetNumber.length < 10) {
            return sock.sendMessage(remoteJid, { 
                text: '❌ Debes escribir un número válido junto al código de país sin el +.\n\n*Ejemplos:*\n➤ Perú: `.add 51920027884`\n➤ México: `.add 5215512345678`' 
            }, { quoted: msg });
        }

        const targetJid = `${targetNumber}@s.whatsapp.net`;

        try {
            await sock.sendMessage(remoteJid, { text: `⏳ Intentando agregar a @${targetNumber}...`, mentions: [targetJid] }, { quoted: msg });

            const response = await sock.groupParticipantsUpdate(remoteJid, [targetJid], 'add');
            
            // Analizamos el código de respuesta de los servidores de WhatsApp
            const status = response[0]?.status || response[targetJid]?.code || '200';

            if (status === '403' || status == 403) {
                return sock.sendMessage(remoteJid, { 
                    text: `⚠️ La privacidad de @${targetNumber} no me permite agregarlo directamente.\n\nTendrás que enviarle el link de invitación del grupo de forma manual.`, 
                    mentions: [targetJid] 
                }, { quoted: msg });
            } 
            else if (status === '409' || status == 409) {
                return sock.sendMessage(remoteJid, { text: `⚠️ El usuario @${targetNumber} ya se encuentra dentro de este grupo.`, mentions: [targetJid] }, { quoted: msg });
            } 
            else {
                return sock.sendMessage(remoteJid, { text: `✅ ¡@${targetNumber} ha sido agregado exitosamente!`, mentions: [targetJid] }, { quoted: msg });
            }

        } catch (error) {
            console.error('❌ Error en comando add:', error);
            return sock.sendMessage(remoteJid, { 
                text: `❌ Ocurrió un error al intentar agregar a @${targetNumber}.\n\n*Revisa que:*\n- El número exista en WhatsApp.\n- El número no me tenga bloqueado.`,
                mentions: [targetJid]
            }, { quoted: msg });
        }
    }
};
