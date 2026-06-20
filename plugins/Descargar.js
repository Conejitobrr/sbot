'use strict';

module.exports = {
  commands: ['descargar'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg, sender } = ctx;

    // 1. Si el usuario envía solo un número (ej: .descargar 1)
    if (args.length === 1 && !isNaN(args[0])) {
      const indice = parseInt(args[0]) - 1;
      const resultados = global.menuBusqueda ? global.menuBusqueda.get(sender) : null;

      if (!resultados || resultados.length === 0) {
        return sock.sendMessage(remoteJid, { text: '❌ Primero debes buscar un video con .buscarfb' }, { quoted: msg });
      }

      if (indice < 0 || indice >= resultados.length) {
        return sock.sendMessage(remoteJid, { text: `❌ Elige un número del 1 al ${resultados.length}.` }, { quoted: msg });
      }

      const linkElegido = resultados[indice].url;
      
      // Enviamos el link limpio para que lo copies a Web Video Caster
      return sock.sendMessage(remoteJid, { 
        text: `✅ *Has seleccionado:* ${resultados[indice].title}\n\n🔗 *Copia este link y pégalo en Web Video Caster para verlo en tu TV:*\n${linkElegido}` 
      }, { quoted: msg });
    }

    // 2. Si el usuario envía un link directo
    const url = args[0];
    if (url && url.includes('facebook.com')) {
      return sock.sendMessage(remoteJid, { text: `🔗 *Link recibido:* ${url}\nÁbrelo en Web Video Caster.` }, { quoted: msg });
    }

    return sock.sendMessage(remoteJid, { text: '❌ Uso correcto:\n.buscarfb jujutsu kaisen\n.descargar 1' }, { quoted: msg });
  }
};
