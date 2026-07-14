'use strict';

module.exports = {
  commands: ['reportar', 'reporte', 'bug'],

  async execute({ sock, remoteJid, args, msg, sender, pushName }) {
    try {
      if (!args.length) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Escribe el error que encontraste.\n\nEjemplo:\n.reportar El comando .play a veces no responde.'
        }, { quoted: msg });
      }

      const reporte = args.join(' ').trim();
      
      // 🔥 Tu número personal ya formateado para Baileys
      const ownerJid = '51958959882@s.whatsapp.net';

      // Construimos el mensaje que te llegará a ti
      const mensajeOwner = `🚨 *REPORTE DE ERROR* 🚨\n\n👤 *De:* @${sender.split('@')[0]} (${pushName || 'Sin nombre'})\n💬 *Chat ID:* ${remoteJid}\n\n📝 *Reporte:*\n${reporte}`;

      // 1. Te enviamos el reporte a ti por privado
      await sock.sendMessage(ownerJid, { 
        text: mensajeOwner, 
        mentions: [sender] 
      });

      // 2. Le confirmamos al usuario que el mensaje se envió
      await sock.sendMessage(remoteJid, {
        text: '✅ *Reporte enviado con éxito.*\nEl desarrollador revisará el error lo más pronto posible. ¡Gracias por ayudar a mejorar el bot!'
      }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error en comando reportar:', err);
      await sock.sendMessage(remoteJid, {
        text: '❌ Hubo un error al intentar enviar el reporte.'
      }, { quoted: msg });
    }
  }
};
