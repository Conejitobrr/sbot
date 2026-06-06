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

        const encoded = encodeURIComponent(query);

        // 🔥 API estable (Unsplash Source - no key)
        const url = `https://source.unsplash.com/800x600/?${encoded}`;

        try {

            await sock.sendMessage(remoteJid, {
                text: `🔎 Buscando: *${query}*`
            }, { quoted: msg });

            await sock.sendMessage(remoteJid, {
                image: { url },
                caption: `🖼️ Resultado: *${query}*`
            }, { quoted: msg });

        } catch (e) {

            console.log('IMG ERROR:', e?.message || e);

            await sock.sendMessage(remoteJid, {
                text: '❌ No se pudo obtener la imagen, intenta otra búsqueda.'
            }, { quoted: msg });
        }
    }
};
