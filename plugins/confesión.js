'use strict';

// Limpieza del JID para comparaciones exactas
function cleanJid(jid = '') {
    if (!jid) return '';
    const str = String(jid);
    const user = str.split(':')[0].split('@')[0];
    const domain = str.includes('@') ? str.split('@')[1] : 's.whatsapp.net';
    return `${user}@${domain}`;
}

module.exports = {
    commands: ['confesar', 'confesion'],
    
    execute: async (ctx) => {
        const { sock, remoteJid, msg, sender, args, fromGroup } = ctx;
        const userJid = cleanJid(sender);

        // ==========================================
        // SI EL USUARIO ESCRIBE EN EL GRUPO
        // ==========================================
        if (fromGroup) {
            // 1. Borramos el mensaje del usuario inmediatamente
            // ⚠️ IMPORTANTE: El bot debe ser administrador para que esto funcione.
            try {
                await sock.sendMessage(remoteJid, { delete: msg.key });
            } catch (e) {
                console.log('❌ No se pudo borrar el mensaje de confesión. (Falta permiso de administrador)');
            }

            // 2. Le mandamos las instrucciones por privado, sin dejar rastro en el grupo
            try {
                await sock.sendMessage(userJid, {
                    text: `🤫 *ZONA DE CONFESIONES* 🤫\n\nVi que intentaste confesarte en un grupo. Acabo de borrar tu mensaje como todo un ninja para proteger tu identidad 🥷.\n\nPara soltar tu chisme, respóndeme *aquí mismo por privado* con el comando:\n\n*.confesar [Tu secreto o chisme]*\n\n_Al hacerlo, tu secreto será publicado de forma totalmente anónima en TODOS los grupos que tú y yo compartamos._`
                });
            } catch (error) {
                // Si el usuario tiene la privacidad cerrada y no permite DMs
                console.log(`❌ No pude enviarle DM a ${userJid}. Debe escribirme primero.`);
            }
            
            return; // Detenemos la ejecución aquí
        } 
        
        // ==========================================
        // SI EL USUARIO ESCRIBE POR PRIVADO (DM)
        // ==========================================
        else {
            // Verificamos que haya escrito el secreto
            if (args.length === 0) {
                return sock.sendMessage(remoteJid, { 
                    text: `❌ Se te olvidó escribir el chisme.\n\nEjemplo:\n*.confesar Creo que el admin es medio raro*` 
                });
            }

            const secreto = args.join(' ');
            
            // Le avisamos que estamos procesando el escáner
            await sock.sendMessage(remoteJid, { text: `⏳ Buscando grupos en común y lanzando la bomba...` });

            let gruposEnviados = 0;

            try {
                // Obtenemos TODOS los grupos en los que está el bot
                const allGroups = await sock.groupFetchAllParticipating();

                // Iteramos sobre todos los grupos para encontrar coincidencias
                for (const [groupId, group] of Object.entries(allGroups)) {
                    const participants = group.participants || [];
                    
                    // Verificamos si el usuario pertenece a este grupo
                    const isMember = participants.some(p => cleanJid(p.id) === userJid);

                    if (isMember) {
                        // Enviamos la confesión al grupo donde coincidimos
                        await sock.sendMessage(groupId, {
                            text: `👤 *CONFESIÓN ANÓNIMA* 👤\n\n"${secreto}"`
                        });
                        gruposEnviados++;
                    }
                }

                // Manejo de caso extremo: No comparten grupos
                if (gruposEnviados === 0) {
                    return sock.sendMessage(remoteJid, { 
                        text: `❌ Qué extraño... No logré encontrar ningún grupo que compartamos en este momento. Asegúrate de estar en al menos un grupo conmigo.` 
                    });
                }

                // Confirmación de éxito al usuario en su chat privado
                return sock.sendMessage(remoteJid, { 
                    text: `✅ ¡Travesura realizada!\n\nTu confesión ha sido enviada con éxito a *${gruposEnviados}* grupo(s). Nadie sabrá jamás que fuiste tú 🤫.` 
                });

            } catch (err) {
                console.error('❌ Error enviando confesión masiva:', err);
                return sock.sendMessage(remoteJid, { text: '❌ Ocurrió un error en el servidor al intentar enviar tu confesión.' });
            }
        }
    }
};
