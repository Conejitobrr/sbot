'use strict';

const axios = require('axios');

async function searchImages(query) {
    try {
        const res = await axios.get('https://duckduckgo.com/?q=' + encodeURIComponent(query) + '&iax=images&ia=images', {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });

        const body = res.data;

        const urls = [...body.matchAll(/"image":"(.*?)"/g)].map(m => m[1]);

        return urls.filter(u =>
            u.startsWith('http') &&
            !u.includes('base64')
        );

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
                text: '❌ Escribe lo que quieres buscar\nEj: .img gatos tiernos'
            }, { quoted: msg });
        }

        await sock.sendMessage(remoteJid, {
            text: `🔎 Buscando imágenes de: *${query}*...`
        }, { quoted: msg });

        const images = await searchImages(query);

        if (!images.length) {
            return sock.sendMessage(remoteJid, {
                text: '❌ No encontré imágenes 😢'
            }, { quoted: msg });
        }

        const img = images[Math.floor(Math.random() * images.length)];

        await sock.sendMessage(remoteJid, {
            image: { url: img },
            caption: `🖼️ Resultado para: *${query}*`
        }, { quoted: msg });
    }
};
