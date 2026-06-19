'use strict';

const axios = require('axios');

const cooldowns = new Map();
const COOLDOWN_TIME = 1 * 60 * 1000; 

module.exports = {
  commands: ['descargar', 'anime'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg, sender, isOwner } = ctx;

    const esCreador = isOwner || sender.includes('TU_NUMERO_AQUI'); // Pon tu número si esOwner falla

    if (!esCreador && cooldowns.has(sender)) {
      const tiempoPasado = Date.now() - cooldowns.get(sender);
      if (tiempoPasado < COOLDOWN_TIME) {
        return sock.sendMessage(remoteJid, { text: '⏳ *Anti-Spam:* Espera 1 minuto antes de descargar otro video.' }, { quoted: msg });
      }
    }

    const url = args[0];

    // Verificamos que sea un enlace del buscador
    if (!url || !url.startsWith('https://www.tokyvideo.com/video/')) {
      return sock.sendMessage(remoteJid, { text: '❌ Formato incorrecto.\nDebes pegar el enlace exacto que te dio el buscador.\n\nEjemplo: .descargar https://www.tokyvideo.com/video/...' }, { quoted: msg });
    }

    await sock.sendMessage(remoteJid, { text: `💻 *Procesando enlace...*\nExtrayendo el video MP4 de los servidores.` }, { quoted: msg });

    try {
      const { data } = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });

      // Usamos una Expresión Regular para encontrar cualquier enlace MP4 oculto en el código fuente
      const mp4Match = data.match(/(https:\/\/[^\s"'<>]+\.mp4)/i);

      if (!esCreador) cooldowns.set(sender, Date.now());

      if (!mp4Match) {
        return sock.sendMessage(remoteJid, { text: `⚠️ *Servidor Encriptado*\nEl video está ahí, pero el servidor ocultó el MP4 directo. Ábrelo desde tu celular para verlo:\n${url}` }, { quoted: msg });
      }

      const finalMp4Url = mp4Match[1];

      await sock.sendMessage(remoteJid, { text: `✅ *Video Desencriptado*\nEl archivo MP4 está en camino. Esto puede tardar un poco dependiendo de su peso...` }, { quoted: msg });

      // Enviamos el video como documento
      return await sock.sendMessage(remoteJid, {
        document: { url: finalMp4Url },
        mimetype: 'video/mp4',
        fileName: `Capitulo_Descargado.mp4`,
        caption: `✅ *DESCARGA COMPLETADA*\n\n🔗 *Fuente:* TokyVideo\n👤 *Pedido por:* @${sender.split('@')[0]}`,
        mentions: [sender]
      }, { quoted: msg });

    } catch (e) {
      console.log('❌ Error al descargar:', e.message);
      return sock.sendMessage(remoteJid, { text: '❌ Error interno al forzar la descarga del video.' }, { quoted: msg });
    }
  }
};
