'use strict';

const axios = require('axios');

// 🧠 mejora básica de búsqueda (mini “IA”)
function improveQuery(q = '') {
    q = q.toLowerCase();

    const map = [
        ['batimix', 'batman cinematic wallpaper'],
        ['perrito', 'cute puppy'],
        ['gato', 'cute cat'],
        ['carro', 'sports car wallpaper'],
        ['anime', 'anime aesthetic wallpaper']
    ];

    for (const [bad, good] of map) {
        if (q.includes(bad)) return good;
    }

    return q;
}

async function bingImages(query) {
    try {
        const res = await axios.get(
            `https://www.bing.com/images/async?q=${encodeURIComponent(query)}&first=0&count=30`,
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                },
                timeout: 15000
            }
        );

        const html = res.data;

        const matches = [...html.matchAll(/murl&quot;:&quot;(.*?)&quot;/g)];

        return matches
            .map(m => m[1])
            .filter(u => u && u.startsWith('http'));

    } catch {
        return [];
    }
}

module.exports = {
    commands: ['img', 'image', 'imgpro'],

    execute: async (ctx) => {

        const { sock, remoteJid, args, msg } = ctx;

        let query = args.join(' ').trim();

        if (!query) {
            return sock.sendMessage(remoteJid, {
                text: '❌ Uso:\n.img gatos tiernos'
            }, { quoted: msg });
        }

        // 🧠 mejorar búsqueda automáticamente
        const improved = improveQuery(query);

        await sock.sendMessage(remoteJid, {
            text: `🔎 Buscando:\n*${query}*\n✨ Mejorado a: *${improved}*`
        }, { quoted: msg });

        let images = await bingImages(improved);

        // 🔥 fallback inteligente
        if (!images.length) {
            images = [
                `https://source.unsplash.com/800x600/?${encodeURIComponent(improved)}`,
                `https://picsum.photos/seed/${encodeURIComponent(improved)}/800/600`
            ];
        }

        // 📸 tomar hasta 5 imágenes
        const results = images.slice(0, 5);

        for (let i = 0; i < results.length; i++) {
            try {
                await sock.sendMessage(remoteJid, {
                    image: { url: results[i] },
                    caption: `🖼️ Resultado ${i + 1} de "${query}"`
                }, { quoted: msg });
            } catch {}
        }
    }
};
