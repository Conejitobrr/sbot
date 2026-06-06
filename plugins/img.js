'use strict';

module.exports = {
    commands: ['img', 'image'],

    execute: async (ctx) => {

        const { sock, remoteJid, args, msg } = ctx;

        const query = args.join(' ').trim();

        if (!query) {
            return sock.sendMessage(remoteJid, {
                text: '❌ Uso:\n.img gatos tiernos'
            }, { quoted: msg });
        }

        // limpiar query para URL
        const prompt = encodeURIComponent(query);

        // API estable de imágenes
        const url = `https://image.pollinations.ai/prompt/${prompt}`;

        try {

            await sock.sendMessage(remoteJid, {
                text: `🔎 Buscando: *${query}*`
            }, { quoted: msg });

            await sock.sendMessage(remoteJid, {
                image: { url },
                caption: `🖼️ Resultado: *${query}*`
            }, { quoted: msg });

        } catch (e) {

            console.log('Error img:', e);

            await sock.sendMessage(remoteJid, {
                text: '❌ No se pudo generar la imagen, intenta otra búsqueda.'
            }, { quoted: msg });
        }
    }
};
