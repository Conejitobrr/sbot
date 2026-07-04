'use strict';

// Función para limpiar el texto y dejar solo los números
function cleanNumber(num = '') {
    return num.replace(/\D/g, ''); // Borra espacios, letras y signos como el "+"
}

module.exports = {
    commands: ['add', 'agregar', 'añadir'],
    
    execute: async (ctx) => {
        const { sock, remoteJid, msg, args, fromGroup, isAdmin, isOwner, isBotAdmin } = ctx;

        // 1. Verificación: Que se use dentro de un grupo
        if (!fromGroup) {
            return sock.sendMessage(remoteJid, { text: '❌ Este comando solo funciona dentro de grupos.' }, { quoted: msg });
        }

        // 2. Verificación de Permisos del Usuario (Solo Admin o Owner)
        if (!isAdmin && !isOwner) {
            return sock.sendMessage(remoteJid, { text: '❌ Solo los administradores del grupo o mi creador (Owner) pueden usar este comando.' }, { quoted: msg });
        }

        // 3. Verificación de Permisos del Bot
        if (!isBotAdmin) {
            return sock.sendMessage(remoteJid, { text: '❌ Necesito ser administrador del grupo para poder agregar personas.' }, { quoted: msg });
        }

        // 4. Procesar el número ingresado
        const rawInput = args.join(''); // Une los argumentos por si dejaron espacios
        const targetNumber = cleanNumber(rawInput);

        // Si no escribieron nada o el número es muy corto
        if (!targetNumber || targetNumber.length < 10) {
            return sock.sendMessage(remoteJid, { 
                text: '❌ Debes escribir un número de teléfono válido junto al código de país.\n\n*Ejemplo:*\n*.add 51999999999*' 
            }, { quoted: msg });
        }

        const targetJid = `${targetNumber}@s.whatsapp.net`;

        try {
            // Mensaje de espera para que se vea interactivo
            await sock.sendMessage(remoteJid, { text: `⏳ Intentando agregar a @${targetNumber}...`, mentions: [targetJid] }, { quoted: msg });

            // 5. Ejecutar la acción en WhatsApp
            const response = await sock.groupParticipantsUpdate(remoteJid, [targetJid], 'add');
            
            // 6. Manejo de la respuesta de WhatsApp
            // Dependiendo de la privacidad del usuario, WhatsApp devuelve un código de estado.
            const status = response[0]?.status || response[targetJid]?.code || '200';

            if (status === '403' || status == 403) {
                return sock.sendMessage(remoteJid, { 
                    text: `⚠️ No pude agregar a @${targetNumber} porque su configuración de privacidad bloquea que lo agreguen a grupos directamente.\n\nTendrás que enviarle el link del grupo manualmente.`, 
                    mentions: [targetJid] 
                }, { quoted: msg });
            } 
            else if (status === '409' || status == 409) {
                return sock.sendMessage(remoteJid, { text: `⚠️ El usuario @${targetNumber} ya se encuentra en este grupo.`, mentions: [targetJid] }, { quoted: msg });
            } 
            else {
                return sock.sendMessage(remoteJid, { text: `✅ ¡@${targetNumber} ha sido agregado exitosamente al grupo!`, mentions: [targetJid] }, { quoted: msg });
            }

        } catch (error) {
            console.error('❌ Error en comando add:', error);
            return sock.sendMessage(remoteJid, { 
                text: `❌ Ocurrió un error al intentar agregar a @${targetNumber}.\n\n*Posibles causas:*\n- El número no tiene WhatsApp.\n- Esa persona bloqueó al bot.\n- Me han restringido por spam.`,
                mentions: [targetJid]
            }, { quoted: msg });
        }
    }
};
