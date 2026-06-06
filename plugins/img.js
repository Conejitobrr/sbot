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
                text: `🔎 Buscando imágenes de: *${query}*`
            }, { quoted: msg });

            const res = await axios.get(
                `https://www.bing.com/images/async?q=${encodeURIComponent(query)}&first=0&count=20`,
                {
                    headers: {
                        'User-Agent': 'Mozilla/5.0'
                    },
                    timeout: 15000
                }
            );

            const html = res.data;

            const matches = [...html.matchAll(/murl&quot;:&quot;(.*?)&quot;/g)];

            const images = matches
                .map(m => m[1])
                .filter(u => u && u.startsWith('http'));

            if (!images.length) {
                throw new Error('no images found');
            }

            const img = images[Math.floor(Math.random() * images.length)];

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
