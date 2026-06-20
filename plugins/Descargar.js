'use strict';

module.exports = {
  commands: ['descargar'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg, sender } = ctx;
    
    // 1. ¿Es una selección numérica? (ej: "1")
    if (args[0] && args[0].length === 1 && !isNaN(args[0])) {
      const indice = parseInt(args[0]) - 1;
      const links = global.menuBusqueda.get(sender);

      if (!links || !links[indice]) {
        return sock.sendMessage(remoteJid, { text: '❌ Primero debes buscar un video con .buscarfb' }, { quoted: msg });
      }

      const urlElegida = links[indice];
      await sock.sendMessage(remoteJid, { text: `✅ Has seleccionado el video ${args[0]}. Preparando descarga...` }, { quoted: msg });
      
      // AQUÍ LLAMAS A TU LÓGICA DE DESCARGA (o simplemente envías el link)
      return sock.sendMessage(remoteJid, { text: `📥 *Descarga lista:* ${urlElegida}` }, { quoted: msg });
    }

    // 2. ¿Es un enlace directo?
    const url = args[0];
    if (url && url.includes('facebook.com')) {
      return sock.sendMessage(remoteJid, { text: `📥 *Enlace recibido:* ${url}` }, { quoted: msg });
    }

    return sock.sendMessage(remoteJid, { text: '❌ Usa .buscarfb [nombre] primero.' }, { quoted: msg });
  }
};
