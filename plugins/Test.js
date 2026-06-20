'use strict';

module.exports = {
  commands: ['test'],

  async execute(ctx) {
    const { sock, remoteJid } = ctx;

    // 1. Imprimir lo que realmente está leyendo el bot
    console.log("===========================");
    console.log("ID Original del chat:", remoteJid);
    
    // 2. Extraer SOLO los números del ID (eliminando @lid, @s.whatsapp.net, etc.)
    const numeroLimpio = remoteJid.replace(/[^0-9]/g, ''); 
    
    // 3. Reconstruir el ID exacto que WhatsApp exige para privados
    const jidForzado = `${numeroLimpio}@s.whatsapp.net`;

    console.log("Intentando enviar a JID Forzado:", jidForzado);
    console.log("===========================");

    try {
        // Enviamos un texto simple sin citar, directo a la raíz del número
        await sock.sendMessage(jidForzado, { text: '🚀 ¡Prueba de envío con formato puro!' });
        console.log("✅ La librería envió el paquete al servidor.");
    } catch (e) {
        console.error("❌ Error interno al enviar:", e);
    }
  }
};
