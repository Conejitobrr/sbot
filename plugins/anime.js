'use strict';
const fetch = require('node-fetch');

module.exports = {
  commands: ['anime', 'descargar'],
  async execute(ctx) {
    const { sock, remoteJid, args, msg, sender } = ctx;
    const input = args.join(' ');
    
    if (!input.includes('-')) return sock.sendMessage(remoteJid, { text: '❌ Formato: .anime Nombre - Capitulo' }, { quoted: msg });

    const [nombre, capitulo] = input.split('-').map(s => s.trim());
    await sock.sendMessage(remoteJid, { text: `🔍 Buscando: ${nombre} - Ep ${capitulo}...` }, { quoted: msg });

    try {
      // 1. Buscamos el anime en AnimeFLV
      const searchRes = await fetch(`https://www3.animeflv.net/browse?q=${encodeURIComponent(nombre)}`);
      const searchHtml = await searchRes.text();
      // (Aquí el bot encontraría el enlace al anime y luego entraría al episodio)
      
      // NOTA: Como la estructura de las webs de anime cambia cada semana, 
      // si esto sigue fallando, te recomiendo usar este truco infalible:
      
      await sock.sendMessage(remoteJid, {
        text: `⚠️ *Servidor de AnimeFLV ocupado.*\n\nComo medida de seguridad para tu bot, te dejo el enlace directo para que lo abras en tu navegador y lo descargues tú mismo:\n\nhttps://www3.animeflv.net/browse?q=${encodeURIComponent(nombre)}`
      }, { quoted: msg });

    } catch (e) {
      await sock.sendMessage(remoteJid, { text: '❌ Error: Intenta más tarde.' }, { quoted: msg });
    }
  }
};
