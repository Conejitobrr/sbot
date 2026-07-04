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

            // 🔥 NUEVA LISTA DE CHISMES VIRTUALES Y DE REDES SOCIALES 🔥
            const chismes = [
                `Me enteré por ahí que @user1 y @user2 se quedan en llamada de WhatsApp hasta las 4 AM... 🤫🔥`,
                `Dice el rumor que @user1 tiene fijado el chat privado de @user2 📌👀`,
                `Un pajarito me contó que @user1 le responde los estados a @user2 en menos de 1 minuto ⏱️💖`,
                `La tensión entre @user1 y @user2 cuando escriben en el grupo se nota a kilómetros... ¡Ya cásense! 💍`,
                `Alguien filtró que @user1 y @user2 se escapan para jugar juntos en la madrugada 🎮👩‍❤️‍👨`,
                `A mí no me engañan, esos mensajes eliminados de @user1 eran declaraciones para @user2 😏`,
                `Confesión anónima interceptada: "@user1 se pone celoso/a cuando le comentan o etiquetan a @user2" 🚩🙊`,
                `Dicen las malas lenguas que @user1 tiene una colección secreta de stickers de @user2 📁😳`,
                `Lo voy a soltar: @user1 le envía TikToks y Reels de amor a @user2 todo el día. De nada por el dato. 📱✨`,
                `Me pasaron captura de que @user1 y @user2 se mandan audios de más de 10 minutos por interno 🎙️🔥`,
                `¿Alguien más notó que @user1 siempre reacciona rápido a los mensajes de @user2 en el grupo? 🕵️‍♂️`,
                `Se rumorea que @user1 y @user2 planean ponerse fotos de perfil compartidas (goals) en secreto 🤫🖼️`,
                `En el fondo todos sabemos que @user1 sigue en este grupo solo para leer lo que escribe @user2 🤭`,
                `Me datearon que @user1 y @user2 se dedican canciones de Rata Blanca por interno... 🎸🖤`,
                `A @user1 se le escapan los "te quiero" cuando habla por privado con @user2 💌`,
                `El mayor secreto de este grupo es que @user1 le revisa la última conexión a @user2 a cada rato 👁️👄👁️`,
                `Alguien me dijo que @user1 se pone a sonreír a la pantalla cada vez que @user2 escribe en el chat 📱🥰`,
                `Tengo info clasificada de que @user1 y @user2 tienen un servidor de Discord solo para ellos dos 🎧🙊`
            ];

            // Elegimos un chisme al azar
            const chismeElegido = chismes[Math.floor(Math.random() * chismes.length)];
            
            // Reemplazamos las etiquetas con los números reales formateados con @
            const textoFinal = chismeElegido
                .replace('@user1', `@${number(random1)}`)
                .replace('@user2', `@${number(random2)}`);

            // Enviamos el mensaje al grupo etiquetando a las dos víctimas
            return sock.sendMessage(remoteJid, { 
                text: `🗣️ *CHISMESITO FRESCO* 🗣️\n\n${textoFinal}`, 
                mentions: [random1, random2] 
            }, { quoted: msg });

        } catch (error) {
            console.error('❌ Error en el plugin chisme:', error);
            return sock.sendMessage(remoteJid, { text: '❌ Ups, me falló la memoria y se me olvidó el chisme. Intenta de nuevo.' }, { quoted: msg });
        }
    }
};
