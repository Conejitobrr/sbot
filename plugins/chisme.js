'use strict';

// Funciones a prueba de balas para que las menciones siempre salgan en color azul
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

module.exports = {
    commands: ['chisme', 'chismear', 'rumor'],
    
    execute: async (ctx) => {
        const { sock, remoteJid, msg, fromGroup } = ctx;

        // Este comando es exclusivo para grupos
        if (!fromGroup) {
            return sock.sendMessage(remoteJid, { text: '❌ Los chismes más jugosos solo se cuentan en los grupos.' }, { quoted: msg });
        }

        try {
            // Obtenemos todos los participantes del grupo actual
            const metadata = await sock.groupMetadata(remoteJid);
            const participants = metadata.participants.map(p => cleanJid(p.id));
            
            // Obtenemos el ID del bot para no incluirlo en el chisme
            const botJid = cleanJid(sock.user.id);
            
            // Filtramos la lista para que solo queden los usuarios reales
            const realUsers = participants.filter(jid => jid !== botJid);

            // Verificamos que haya suficiente gente para armar el chisme
            if (realUsers.length < 2) {
                return sock.sendMessage(remoteJid, { text: '❌ El grupo está muy muerto, no hay suficiente gente para inventar un buen chisme.' }, { quoted: msg });
            }

            // Seleccionamos a la Persona 1 al azar
            const random1 = realUsers[Math.floor(Math.random() * realUsers.length)];
            let random2 = realUsers[Math.floor(Math.random() * realUsers.length)];
            
            // Nos aseguramos de que la Persona 2 no sea la misma que la Persona 1
            while (random1 === random2) {
                random2 = realUsers[Math.floor(Math.random() * realUsers.length)];
            }

            // Lista de plantillas para generar chismes aleatorios
            const chismes = [
                `Me enteré por ahí que @user1 le tiene unas ganas tremendas a @user2... 🤫🔥`,
                `Ayer me pareció ver a @user1 y @user2 muy juntitos en la esquina. ¿Qué estarán ocultando? 👀`,
                `Un pajarito me contó que @user1 le dedica sus estados de WhatsApp a @user2 🎶💖`,
                `Dice el rumor que @user1 guarda fotos secretas de @user2 en su galería 📸😳`,
                `La tensión sexual entre @user1 y @user2 se puede cortar con un cuchillo 🔪🔥`,
                `Últimamente @user1 no para de hablarme por privado sobre @user2... ¡Alguien está enamorado! 💘`,
                `Vi a @user1 buscando anillos de compromiso en internet... Y todo apunta a que son para @user2 💍👰`,
                `El mayor secreto de este grupo es que @user1 y @user2 se escapan juntos en las madrugadas 🏃‍♂️🏃‍♀️💨`,
                `A mí no me engañan, todas esas peleas entre @user1 y @user2 son pura tensión acumulada 😏`,
                `Confesión anónima interceptada: "@user1 daría toda su experiencia (XP) por un beso de @user2" 🙊`,
                `Alguien me dijo que @user1 se pone celoso/a cuando @user2 habla con otros en el grupo 😒💔`,
                `Lo voy a soltar: @user1 sueña con @user2 todas las noches. De nada por el dato. 🛌✨`
            ];

            // Elegimos un chisme al azar
            const chismeElegido = chismes[Math.floor(Math.random() * chismes.length)];
            
            // Reemplazamos las etiquetas con los números reales formateados con @
            const textoFinal = chismeElegido
                .replace('@user1', `@${number(random1)}`)
                .replace('@user2', `@${number(random2)}`);

            // Enviamos el mensaje al grupo etiquetando a las dos víctimas
            return sock.sendMessage(remoteJid, { 
                text: `🗣️ *CHISMITO FRESCO* 🗣️\n\n${textoFinal}`, 
                mentions: [random1, random2] 
            }, { quoted: msg });

        } catch (error) {
            console.error('❌ Error en el plugin chisme:', error);
            return sock.sendMessage(remoteJid, { text: '❌ Ups, me falló la memoria y se me olvidó el chisme. Intenta de nuevo.' }, { quoted: msg });
        }
    }
};
