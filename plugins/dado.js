'use strict';

// CRÉDITOS A https://github.com/FG98F por los enlaces de los stickers
const dir = [
    'https://tinyurl.com/ygms8wvy', // Dado 1
    'https://tinyurl.com/yhdyhnap', // Dado 2
    'https://tinyurl.com/yfwjbou7', // Dado 3
    'https://tinyurl.com/yh3e3ogt', // Dado 4
    'https://tinyurl.com/yfmhpvxs', // Dado 5
    'https://tinyurl.com/ygpxka9q'  // Dado 6
];

module.exports = {
    commands: ['dado', 'dados', 'dice'],
    
    execute: async (ctx) => {
        const { sock, remoteJid, msg } = ctx;

        // Elegimos un enlace al azar de la lista
        const randomStickerUrl = dir[Math.floor(Math.random() * dir.length)];

        try {
            // Mensaje de suspenso en el chat
            await sock.sendMessage(remoteJid, { text: '🎲 Tirando el dado...' }, { quoted: msg });

            // Retraso de 1 segundo para dar el efecto de que el dado está rodando
            setTimeout(async () => {
                await sock.sendMessage(remoteJid, { 
                    // El bot descarga y envía el sticker desde la URL
                    sticker: { url: randomStickerUrl } 
                }, { quoted: msg });
            }, 1000);

        } catch (error) {
            console.error('❌ Error en el plugin dado:', error);
            return sock.sendMessage(remoteJid, { text: '❌ Ocurrió un error al intentar lanzar el dado.' }, { quoted: msg });
        }
    }
};
