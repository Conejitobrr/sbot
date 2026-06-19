'use strict';

const axios = require('axios');

const cooldowns = new Map();
const COOLDOWN_TIME = 1 * 60 * 1000; 

module.exports = {
  commands: ['anime', 'descargar'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg, sender, isOwner } = ctx;

    // 👑 ZONA VIP: El bot detecta si eres el creador
    const esCreador = isOwner || sender.includes('TU_NUMERO_AQUI'); // Opcional: pon tu número

    if (!esCreador && cooldowns.has(sender)) {
      const tiempoPasado = Date.now() - cooldowns.get(sender);
      if (tiempoPasado < COOLDOWN_TIME) {
        return sock.sendMessage(remoteJid, { text: '⏳ *Anti-Spam:* Espera 1 minuto antes de buscar otro anime.' }, { quoted: msg });
      }
    }

    const input = args.join(' ');
    if (!input.includes('-')) return sock.sendMessage(remoteJid, { text: '❌ Formato: .anime jujutsu kaisen - 1' }, { quoted: msg });

    const partes = input.split('-');
    const capitulo = partes.pop().trim();
    const nombreAnime = partes.join(' ').trim();

    await sock.sendMessage(remoteJid, { text: `🔍 *Explorando TokyVideo...*\nBuscando "${nombreAnime}" Capítulo ${capitulo} en servidores sin restricción...` }, { quoted: msg });

    try {
      // Creamos la búsqueda exacta para la plataforma
      const query = encodeURIComponent(`${nombreAnime} capitulo ${capitulo} latino`);
      const searchUrl = `https://www.tokyvideo.com/es/search?q=${query}`;

      const { data } = await axios.get(searchUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });

      // Extraemos los links directos a los videos usando Regex (más rápido que Cheerio)
      const links = data.match(/https:\/\/www\.tokyvideo\.com\/video\/[^"']+/g);

      if (!esCreador) cooldowns.set(sender, Date.now());

      if (!links || links.length === 0) {
        return sock.sendMessage(remoteJid, { text: `❌ No encontré el capítulo en la base de datos de TokyVideo.\n\n💡 *Tip:* Asegúrate de escribir el nombre correctamente. (Ej: .anime dragon ball super - 5)` }, { quoted: msg });
      }

      // Filtramos para quitar links repetidos y tomamos los 3 primeros resultados
      const linksUnicos = [...new Set(links)].slice(0, 3);

      let respuestaFinal = 
`✅ *CAPÍTULOS ENCONTRADOS* ✅

🎬 *Anime:* ${nombreAnime}
🔢 *Episodio:* ${capitulo}

Aquí tienes las mejores opciones disponibles:

`;
      
      linksUnicos.forEach((link, i) => {
        respuestaFinal += `*Opción ${i + 1}:* ${link}\n\n`;
      });

      respuestaFinal += `📺 *Tip:* Abre cualquiera de estos enlaces. Son compatibles con tu app *Web Video Caster* para enviarlos directo a tu TV sin bloqueos.`;

      return sock.sendMessage(remoteJid, { text: respuestaFinal }, { quoted: msg });

    } catch (e) {
      console.log('❌ Error en rastreo TokyVideo:', e.message);
      return sock.sendMessage(remoteJid, { text: '❌ Ocurrió un error al conectar con los servidores de video.' }, { quoted: msg });
    }
  }
};
