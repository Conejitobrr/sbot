'use strict';

module.exports = {
  commands: ['test'],

  async execute(ctx) {
    const { sock, remoteJid, msg, sender } = ctx;
    
    // 1. Verificamos si estamos en un grupo
    const esGrupo = remoteJid.includes('@g.us');

    // 2. Rescatamos el número real (@s.whatsapp.net) en lugar del @lid
    let destino = remoteJid;
    if (destino.includes('@lid') && sender) {
        destino = sender; 
    }

    console.log(`Intentando enviar a: ${destino}`);

    try {
        if (esGrupo) {
            // En grupos funcionaba bien, así que lo dejamos normal (citando)
            await sock.sendMessage(destino, { text: '✅ ¡Funciona en el grupo!' }, { quoted: msg });
        } else {
            // 🔥 EN PRIVADO: Quitamos el { quoted: msg } para que WhatsApp no lo bloquee silenciosamente
            await sock.sendMessage(destino, { text: '✅ ¡Logré enviarlo por privado!' }); 
        }
    } catch (e) {
        console.error("Error al enviar:", e);
    }
  }
};
