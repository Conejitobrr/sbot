// Memoria para guardar la página actual de cada usuario
global.paginasBusqueda = global.paginasBusqueda || new Map();

module.exports = {
  commands: ['buscarfb'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg, sender } = ctx;

    // Si escribe ".buscarfb siguiente", mostramos la página 2
    if (args[0] === 'siguiente') {
      const resultados = global.menuBusqueda.get(sender);
      if (!resultados || resultados.length <= 5) return sock.sendMessage(remoteJid, { text: '❌ No hay más resultados.' }, { quoted: msg });
      
      let msgRes = `✅ *Página 2 (Responde 6-10):*\n\n`;
      resultados.slice(5, 10).forEach((item, i) => {
        msgRes += `*${i + 6}.* ${item.title}\n`;
      });
      return sock.sendMessage(remoteJid, { text: msgRes }, { quoted: msg });
    }

    // Búsqueda normal
    const query = args.join(' ');
    // ... (el resto del código de búsqueda anterior)
    
    // Al final del buscador, agregamos este aviso:
    let msgRes = `✅ *Resultados 1-5 (Responde 1-5 para descargar):*\n\n`;
    resultados.slice(0, 5).forEach((item, i) => {
      msgRes += `*${i + 1}.* ${item.title}\n`;
    });
    msgRes += `\n⚡ *Escribe .buscarfb siguiente para ver más.*`;
    
    await sock.sendMessage(remoteJid, { text: msgRes }, { quoted: msg });
  }
};
