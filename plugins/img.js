'use strict';

const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');

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
            text: `🔎 Buscando en Google Images: *${query}*`
        }, { quoted: msg });

        let browser;

        try {

            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const page = await browser.newPage();

            await page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
            );

            // 🔥 abrir Google Images
            await page.goto(
                `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`,
                { waitUntil: 'networkidle2' }
            );

            // 🔥 extraer imágenes reales
            const images = await page.evaluate(() => {
                const imgs = Array.from(document.querySelectorAll('img'));
                return imgs
                    .map(img => img.src)
                    .filter(src => src && src.startsWith('http'));
            });

            await browser.close();

            if (!images.length) {
                return sock.sendMessage(remoteJid, {
                    text: '❌ No se encontraron imágenes en Google'
                }, { quoted: msg });
            }

            const imgUrl = images[Math.floor(Math.random() * images.length)];

            // 🔥 descargar imagen
            const buffer = await axios.get(imgUrl, {
                responseType: 'arraybuffer'
            });

            await sock.sendMessage(remoteJid, {
                image: buffer.data,
                caption: `🖼️ Google Images: *${query}*`
            }, { quoted: msg });

        } catch (e) {

            console.log('IMG ERROR:', e?.message || e);

            if (browser) await browser.close();

            await sock.sendMessage(remoteJid, {
                text: '❌ Error usando navegador, intenta otra búsqueda'
            }, { quoted: msg });
        }
    }
};
