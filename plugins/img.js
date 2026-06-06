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

        await sock.sendMessage(remoteJid, {
            text: `🔎 Buscando imágenes reales de: *${query}*`
        }, { quoted: msg });

        try {

            // 🔥 API tipo Google Images (DuckDuckGo Lite - mejor parsing)
            const url = `https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&o=json`;

            const res = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Accept': 'application/json'
                },
                timeout: 15000
            });

            const results = res.data?.results || [];

            if (!results.length) throw new Error('sin resultados');

            const img = results[Math.floor(Math.random() * results.length)]?.image;

            if (!img) throw new Error('sin imagen');

            await sock.sendMessage(remoteJid, {
                image: { url: img },
                caption: `🖼️ Resultado real: *${query}*`
            }, { quoted: msg });

        } catch (e) {

            console.log('IMG ERROR:', e?.message || e);

            await sock.sendMessage(remoteJid, {
                text: '❌ No se encontraron imágenes reales, intenta otra búsqueda.'
            }, { quoted: msg });
        }
    }
};
