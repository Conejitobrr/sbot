'use strict';

const { Aki } = require('aki-api');

const juegosActivos = new Map();

module.exports = {
  commands: ['aki', 'akinator'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg } = ctx;
    const jugadorId = msg.key.participant || remoteJid;

    const menu = `🧞‍♂️ *EL GENIO AKINATOR* 🧞‍♂️\n\nPiensa en un personaje y yo lo adivinaré.\n\n*Comandos:*\n.aki start (Inicia un juego nuevo)\n.aki 0 (Sí)\n.aki 1 (No)\n.aki 2 (No lo sé)\n.aki 3 (Probablemente)\n.aki 4 (Probablemente no)`;

    if (!args.length) {
      return sock.sendMessage(remoteJid, { text: menu }, { quoted: msg });
    }

    const accion = args[0].toLowerCase();

    // 1. INICIAR JUEGO NUEVO
    if (accion === 'start') {
      await sock.sendMessage(remoteJid, { text: '🧞‍♂️ Despertando al genio... un momento.' }, { quoted: msg });
      
      try {
        const aki = new Aki({ region: 'es' });
        await aki.start();
        
        juegosActivos.set(jugadorId, aki);
        
        return sock.sendMessage(
          remoteJid, 
          { text: `🧞‍♂️ *Pregunta ${aki.currentStep + 1}:*\n${aki.question}\n\nResponde con: .aki 0, .aki 1, etc.` }, 
          { quoted: msg }
        );
      } catch (error) {
        console.error("Error Akinator Start:", error.message);
        // Manejo específico del bloqueo 403
        if (error.message.includes('403')) {
          return sock.sendMessage(remoteJid, { text: '❌ Akinator bloqueó la conexión de nuestro servidor por seguridad. Está descansando, intenta en un rato.' }, { quoted: msg });
        }
        return sock.sendMessage(remoteJid, { text: '❌ El genio no responde. Intenta de nuevo.' }, { quoted: msg });
      }
    }

    // 2. VERIFICAR JUEGO ACTIVO
    if (!juegosActivos.has(jugadorId)) {
      return sock.sendMessage(remoteJid, { text: '❌ No tienes ningún juego activo. Escribe *.aki start*' }, { quoted: msg });
    }

    const aki = juegosActivos.get(jugadorId);
    const respuestasValidas = { '0': 0, 'si': 0, '1': 1, 'no': 1, '2': 2, 'nose': 2, '3': 3, '4': 4 };
    
    if (respuestasValidas[accion] === undefined) {
      return sock.sendMessage(remoteJid, { text: '❌ Respuesta no válida.\nUsa: 0(Sí), 1(No), 2(No sé), 3(Prob. Sí), 4(Prob. No).' }, { quoted: msg });
    }

    try {
      // 3. ENVIAR RESPUESTA
      await aki.step(respuestasValidas[accion]);

      // 4. EL GENIO ADIVINA
      if (aki.progress >= 80 || aki.currentStep >= 79) {
        await aki.win();
        const personajeAdivinado = aki.answers[0];
        
        juegosActivos.delete(jugadorId);
        
        if (!personajeAdivinado) {
          return sock.sendMessage(remoteJid, { text: '🤔 Me rindo, no pude adivinar en quién pensabas.' }, { quoted: msg });
        }

        const mensajeVictoria = `🧞‍♂️ *¡LO TENGO!*\n\nTu personaje es: *${personajeAdivinado.name}*\n_${personajeAdivinado.description}_\n\nAcerté, ¿verdad?`;

        return sock.sendMessage(
          remoteJid, 
          { 
            image: { url: personajeAdivinado.absolute_picture_path }, 
            caption: mensajeVictoria 
          }, 
          { quoted: msg }
        );
      }

      // 5. SIGUIENTE PREGUNTA
      const siguientePregunta = `🧞‍♂️ *Pregunta ${aki.currentStep + 1}* (Progreso: ${Math.round(aki.progress)}%)\n\n${aki.question}\n\n[0] Sí | [1] No | [2] No sé | [3] Prob. Sí | [4] Prob. No`;
      return sock.sendMessage(remoteJid, { text: siguientePregunta }, { quoted: msg });

    } catch (error) {
      console.error("Error Akinator Step:", error.message);
      juegosActivos.delete(jugadorId); // Borramos el juego corrupto
      return sock.sendMessage(remoteJid, { text: '❌ Se perdió la conexión con Akinator en medio del juego. Toca empezar de nuevo.' }, { quoted: msg });
    }
  }
};
