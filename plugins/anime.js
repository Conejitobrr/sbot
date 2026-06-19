'use strict';

const axios = require('axios');
const cheerio = require('cheerio');

const cooldowns = new Map();
const COOLDOWN_TIME = 1 * 60 * 1000; 

module.exports = {
  commands: ['anime', 'descargar'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg, sender, isOwner } = ctx;

    // 🔥 DETECCIÓN AUTOMÁTICA DE OWNER
    // 'isOwner' viene del contexto de tu bot (debería estar definido en tu archivo principal/config)
    // Si tu bot usa una variable global, cámbiala por 'global.owner.includes(sender)'
    const esCreador = isOwner || sender.includes('TU_NUMERO_AQUI'); // Pon tu número aquí por seguridad extra

    if (!esCreador && cooldowns.has(sender)) {
      const tiempoPasado = Date.now() - cooldowns.get(sender);
      if (tiempoPasado < COOLDOWN_TIME) {
        return sock.sendMessage(remoteJid, { text: '⏳ *Sistema Anti-Spam:* Espera 1 minuto.' }, { quoted: msg });
      }
    }

    const input = args.join(' ');
    if (!input.includes('-')) return sock.sendMessage(remoteJid, { text: '❌ Formato: .anime nombre - capitulo' }, { quoted: msg });

    const partes = input.split('-');
    const capitulo = partes.pop().trim();
    const nombreAnime = partes.join(' ').trim();

    await sock.sendMessage(remoteJid, { text: `🔍 *Rastreador Buscando:* "${nombreAnime}" - Ep ${capitulo}...` }, { quoted: msg });

    try {
      // Usamos DuckDuckGo para encontrar links públicos (Google Drive, carpetas abiertas, etc.)
      const query = `site:drive.google.com "${nombreAnime}" "capitulo ${capitulo}" latino OR sub`;
      const urlBusqueda = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

      const { data } = await axios.get(urlBusqueda, { 
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } 
      });

      const $ = cheerio.load(data);
      let linksDrive = '';

      $('.result__snippet').each((i, el) => {
        if (i < 3) {
          const href = $(el).parent().find('.result__url').attr('href');
          if (href && href.includes('uddg=')) {
            const urlParams = new URLSearchParams(href.split('?')[1]);
            const cleanLink = urlParams.get('uddg');
            if (cleanLink) linksDrive += `*Drive:* ${decodeURIComponent(cleanLink)}\n\n`;
          }
        }
      });

      if (!esCreador) cooldowns.set(sender, Date.now());

      if (!linksDrive) {
        return sock.sendMessage(remoteJid, { text: `❌ No encontré enlaces directos para este capítulo.` }, { quoted: msg });
      }

      await sock.sendMessage(remoteJid, { text: `✅ *Enlaces encontrados (Libres de Bloqueo):*\n\n${linksDrive}` }, { quoted: msg });

    } catch (e) {
      return sock.sendMessage(remoteJid, { text: '❌ Error de red.' }, { quoted: msg });
    }
  }
};
