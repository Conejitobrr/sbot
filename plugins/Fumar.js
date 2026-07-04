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

        // 🔥 LISTA DE TITULARES HUMILLANTES 🔥
        const motivos = [
            `Fue captado robando el WiFi de su vecino durante los últimos 3 años.`,
            `Le echó mayonesa y kétchup al ceviche. Un delito imperdonable.`,
            `Se filtró su historial de Google: "Cómo saber si soy guapo test online 100% real".`,
            `Se le escapó un "te amo" mientras le pagaba a la cajera del supermercado.`,
            `Fue descubierto usando hacks en el Buscaminas porque no podía ganar.`,
            `Aún duerme con la luz prendida porque le da miedo que se le aparezca el Ayuwoki.`,
            `Intentó pagar el pasaje del bus con una tarjeta del Uno.`,
            `Lo encontraron llorando en su cuarto porque su mascota virtual de Pou se murió de hambre.`,
            `Finge que tiene novia, pero descubrieron que es una cuenta falsa administrada por él mismo.`,
            `Fue visto declarándosele a un poste de luz a las 3 AM después de una fiesta.`,
            `Lleva 5 días usando la misma ropa interior argumentando que "la volteó para que esté limpia".`,
            `Descubrieron que usa ChatGPT hasta para responder "jaja sí" en WhatsApp.`,
            `Se cayó en la calle y para disimular se puso a hacer flexiones.`,
            `Le pidió a su mamá que lo defienda en una discusión por Facebook.`
        ];

        // Elegimos un motivo aleatorio
        const motivoElegido = motivos[Math.floor(Math.random() * motivos.length)];

        // Le avisamos al grupo que estamos procesando la funa
        await sock.sendMessage(remoteJid, { text: `📸 Contactando a los reporteros y recopilando pruebas contra @${number(target)}...`, mentions: [target] });

        // Intentamos obtener la foto de perfil de WhatsApp del usuario
        let ppUrl;
        try {
            ppUrl = await sock.profilePictureUrl(target, 'image');
        } catch (e) {
            // Si tiene la foto oculta o no tiene, usamos una imagen de "Usuario Anónimo" por defecto
            ppUrl = 'https://i.ibb.co/3pXnFzx/silueta.jpg'; // Un placeholder de silueta en gris
        }

        // Armamos el titular de Última Hora
        const caption = `🚨 *¡ÚLTIMA HORA - FUNA NACIONAL!* 🚨\n\n📺 *EXTRA, EXTRA:* El mundo del internet está en shock. El usuario @${number(target)} acaba de ser cancelado en todas las redes sociales.\n\n🎤 *ACUSACIÓN OFICIAL:*\n_"${motivoElegido}"_\n\n📉 *Consecuencias:* Ha perdido todo el respeto de este grupo.\n\n_¿Qué opinan ustedes? Los leemos en los comentarios._ 🎙️🔥`;

        // Pequeño delay de 2 segundos para dar suspenso
        setTimeout(async () => {
            await sock.sendMessage(remoteJid, {
                image: { url: ppUrl },
                caption: caption,
                mentions: [target]
            }, { quoted: msg });
        }, 2000);
    }
};
