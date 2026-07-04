'use strict';

// Funciones para limpiar menciones
function cleanJid(jid = '') {
    if (!jid) return '';
    const str = String(jid);
    const user = str.split(':')[0].split('@')[0];
    const domain = str.includes('@') ? str.split('@')[1] : 's.whatsapp.net';
    return `${user}@${domain}`;
}

function number(jid = '') {
    return String(jid).split(':')[0].split('@')[0].replace(/\D/g, '');
}

function getTarget(msg) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
    if (quoted) return cleanJid(quoted);
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (mentioned) return cleanJid(mentioned);
    return null;
}

module.exports = {
    commands: ['funar', 'cancelar', 'quemar', 'exponer'],
    
    execute: async (ctx) => {
        const { sock, remoteJid, msg, sender, fromGroup } = ctx;

        if (!fromGroup) {
            return sock.sendMessage(remoteJid, { text: '❌ Este comando es para humillar gente en público. Úsalo en un grupo.' }, { quoted: msg });
        }

        const target = getTarget(msg);
        const p1 = cleanJid(sender);

        if (!target) {
            return sock.sendMessage(remoteJid, { text: '❌ Debes mencionar a la persona que quieres funar.\nEjemplo: *.funar @usuario*' }, { quoted: msg });
        }

        if (target === p1) {
            return sock.sendMessage(remoteJid, { text: '❌ ¿Te quieres funar a ti mismo? Eso es muy triste, busca a otro.' }, { quoted: msg });
        }

        if (target === cleanJid(sock.user.id)) {
            return sock.sendMessage(remoteJid, { text: '🛡️ Yo soy intocable, causa. A mí no me funa nadie.' }, { quoted: msg });
        }

        // 🔥 LISTA DE TITULARES RECONTRA RIDÍCULOS Y QUEMANTES 🔥
        const motivos = [
            `Fue atrapado pajeándose con una skin de Minecraft con curvas a las 4 AM.`,
            `Lo encontraron pajeándose viendo fijamente el fondo de pantalla por defecto de Windows XP.`,
            `Fue captado en flagrante delito pajeándose con una foto del Pou tuneado.`,
            `Le descubrieron un altar secreto en su clóset dedicado a la mamá de su mejor amigo.`,
            `Tiene una cuenta secreta de TikTok donde sube videos vestido de mucama otaku.`,
            `Fue visto declarándosele a una licuadora prendida a las 3 AM pensando que era el amor de su vida.`,
            `Fue captado intentando besar su propio reflejo en el espejo de un baño público y lo rechazaron.`,
            `Le echa mayonesa, kétchup y chicha morada al ceviche. Un psicópata total.`,
            `Fue descubierto robándole el WiFi al vecino para descargar fotos de monas chinas sin ropa.`,
            `Se filtró su historial de búsqueda: "cómo enamorar a una tía millonaria de 80 años buscar".`,
            `Lleva una semana usando la misma ropa interior argumentando que "si la voltea por el revés dura otra semana".`,
            `Se le escapó un "gracias mi amor" con voz temblorosa mientras le pagaba al chofer de la combi.`,
            `Lo encontraron llorando desconsoladamente porque su novia virtual de Roblox lo dejó por un usuario premium.`,
            `Se cayó feo en la calle y para disimular se puso a hacer flexiones en el suelo todo sangrado.`,
            `Le pidió a su mamá que entre a un grupo de compra y venta de Facebook para que lo defienda de un baneo.`
        ];

        // Elegimos un motivo aleatorio
        const motivoElegido = motivos[Math.floor(Math.random() * motivos.length)];

        // Le avisamos al grupo que estamos procesando la funa
        await sock.sendMessage(remoteJid, { text: `📸 Contactando a los reporteros y recopilando las pruebas más turbias contra @${number(target)}...`, mentions: [target] });

        // Intentamos obtener la foto de perfil de WhatsApp del usuario
        let ppUrl;
        try {
            ppUrl = await sock.profilePictureUrl(target, 'image');
        } catch (e) {
            // Si tiene la foto oculta, usamos la silueta anónima
            ppUrl = 'https://i.ibb.co/3pXnFzx/silueta.jpg';
        }

        // Armamos el titular de Última Hora
        const caption = `🚨 *¡ÚLTIMA HORA - FUNA HISTÓRICA!* 🚨\n\n📺 *EXTRA, EXTRA:* El mundo del internet está horrorizado. El usuario @${number(target)} acaba de ser completamente cancelado del planeta tierra.\n\n🎤 *PRUEBAS DE LA ACUSACIÓN:*\n_"${motivoElegido}"_\n\n📉 *Estado actual:* Perdió toda la dignidad que le quedaba en este grupo.\n\n_¿Qué opinan ustedes de este caso tan perturbador? Los leemos en los comentarios._ 🎙️🔥`;

        // Delay de 2 segundos para dar suspenso antes de mandar la bomba
        setTimeout(async () => {
            await sock.sendMessage(remoteJid, {
                image: { url: ppUrl },
                caption: caption,
                mentions: [target]
            }, { quoted: msg });
        }, 2000);
    }
};
