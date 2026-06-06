'use strict';

const axios = require('axios');
const fs = require('fs');
const path = require('path');

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
            text: `🔎 Buscando en la web: *${query}*`
        }, { quoted: msg });

        try {

            // 🔥 1. Buscar imágenes tipo Google
            const res = await axios.get(
                `https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}`,
                {
                    headers: {
                        'User-Agent': 'Mozilla/5.0',
                        'Accept': 'application/json'
                    },
                    timeout: 15000
                }
            );

            const results = res.data?.results || [];

            if (!results.length) {
                return sock.sendMessage(remoteJid, {
                    text: '❌ No se encontraron imágenes'
                }, { quoted: msg });
            }

            const imgUrl = results[0].image;

            if (!imgUrl) {
                return sock.sendMessage(remoteJid, {
                    text: '❌ Imagen inválida'
                }, { quoted: msg });
            }

            // 🔥 2. Descargar imagen localmente
            const fileName = `img_${Date.now()}.jpg`;
            const filePath = path.join(__dirname, fileName);

            const imgBuffer = await axios.get(imgUrl, {
                responseType: 'arraybuffer',
                timeout: 20000
            });

            fs.writeFileSync(filePath, imgBuffer.data);

            // 🔥 3. Enviar a WhatsApp como archivo real
            await sock.sendMessage(remoteJid, {
                image: fs.readFileSync(filePath),
                caption: `🖼️ Resultado: *${query}*`
            }, { quoted: msg });

            // 🔥 4. limpiar archivo
            fs.unlinkSync(filePath);

        } catch (e) {

            console.log('IMG ERROR:', e?.message || e);

            await sock.sendMessage(remoteJid, {
                text: '❌ Error buscando imágenes, intenta otra palabra'
            }, { quoted: msg });
        }
    }
};
