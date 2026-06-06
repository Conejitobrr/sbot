'use strict';

const axios = require('axios');

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

        try {

            await sock.sendMessage(remoteJid, {
                text: `🔎 Buscando: *${query}*`
            }, { quoted: msg });

            const res = await axios.get(
                `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`,
                { timeout: 15000 }
            );

            const matches = [...res.data.matchAll(/"image":"(.*?)"/g)];

            const images = matches
                .map(m => m[1])
                .filter(u => u && u.startsWith('http'));

            const img = images[Math.floor(Math.random() * images.length)];

            if (!img) {
                throw new Error('no images');
            }

            await sock.sendMessage(remoteJid, {
                image: { url: img },
                caption: `🖼️ Resultado: *${query}*`
            }, { quoted: msg });

        } catch (e) {

            console.log('IMG ERROR:', e?.message || e);

            await sock.sendMessage(remoteJid, {
                text: '❌ No se encontraron imágenes, intenta otra búsqueda'
            }, { quoted: msg });
        }
    }
};
