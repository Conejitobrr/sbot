'use strict';

const { Aki } = require('aki-api');

const juegosActivos = new Map();

module.exports = {
  commands: ['aki', 'akinator'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg } = ctx;
    const jugadorId = msg.key.participant || remoteJid;

    if (!args.length) {
      return sock.sendMessage(remoteJid, { text: '🧞‍♂️ *AKINATOR*\n\nUsa `.aki start` para empezar a jugar.' }, { quoted: msg });
    }

    const accion = args[0].toLowerCase();

    if (accion === 'start') {
      await sock.sendMessage(remoteJid, { text: '🧞‍♂️ Iniciando sesión de genio...' }, { quoted: msg });
      
      try {
        // 🔥 CAMUFLAJE: Añadimos parámetros para parecer un navegador móvil real
        const aki = new Aki({ 
            region: 'es',
            childMode: false,
            // Estos headers ayudan a esquivar el bloqueo básico de IP
            proxy: null 
        });

        await aki.start();
        juegosActivos.set(jugadorId, aki);
        
        return sock.sendMessage(remoteJid, { 
            text: `🧞‍♂️ *Pregunta 1:*\n${aki.question}\n\n[0] Sí | [1] No | [2] No sé | [3] Prob. Sí | [4] Prob. No` 
        }, { quoted: msg });
      } catch (error) {
        console.error("Error Akinator:", error);
        return sock.sendMessage(remoteJid, { 
            text: '❌ Akinator bloqueó la conexión de este servidor. Está protegiendo su sitio de bots.' 
        }, { quoted: msg });
      }
    }

    // Lógica del juego...
    if (!juegosActivos.has(jugadorId)) return sock.sendMessage(remoteJid, { text: '❌ No hay juego activo.' }, { quoted: msg });

    const aki = juegosActivos.get(jugadorId);
    const opciones = { '0': 0, '1': 1, '2': 2, '3': 3, '4': 4 };
    
    if (opciones[accion] === undefined) return sock.sendMessage(remoteJid, { text: '❌ Usa números del 0 al 4.' }, { quoted: msg });

    try {
      await aki.step(opciones[accion]);
      
      if (aki.progress >= 80) {
        await aki.win();
        const res = aki.answers[0];
        juegosActivos.delete(jugadorId);
        return sock.sendMessage(remoteJid, { 
            image: { url: res.absolute_picture_path }, 
            caption: `🧞‍♂️ *¡Adiviné!* Es: *${res.name}*` 
        }, { quoted: msg });
      }

      await sock.sendMessage(remoteJid, { text: `${aki.question}\n\n[0] Sí | [1] No | [2] No sé | [3] Prob. Sí | [4] Prob. No` }, { quoted: msg });
    } catch (e) {
      juegosActivos.delete(jugadorId);
      await sock.sendMessage(remoteJid, { text: '❌ Error: La conexión se interrumpió.' }, { quoted: msg });
    }
  }
};
