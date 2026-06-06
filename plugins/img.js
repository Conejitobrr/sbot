'use strict';

const axios = require('axios');

async function getImage(query) {
    try {
        // API estable de búsqueda de imágenes
        const res = await axios.get(
            `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&ia=images`,
            { timeout: 10000 }
        );

        const results = res.data?.RelatedTopics || [];

        let urls = [];

        for (const r of results) {
            if (r?.Icon?.URL) {
                urls.push(r.Icon.URL);
            }
            if (r?.FirstURL) {
                urls.push(r.FirstURL);
            }
        }

        return urls.filter(u => u.startsWith('http'));

    } catch (e) {
        return [];
    }
}

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

        await sock.sendMessage(remoteJid, {
            text: `🔎 Buscando: *${query}*`
        }, { quoted: msg });

        let images = await getImage(query);

        // 🔥 fallback seguro si falla todo
        if (!images.length) {
            images = [
                `https://picsum.photos/seed/${encodeURIComponent(query)}/800/600`
            ];
        }

        const img = images[Math.floor(Math.random() * images.length)];

        await sock.sendMessage(remoteJid, {
            image: { url: img },
            caption: `🖼️ Resultado: *${query}*`
        }, { quoted: msg });
    }
};
