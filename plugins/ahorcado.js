'use strict';

const db = require('../lib/database');
const sesiones = new Map();

// Palabras variadas y cotidianas
const palabras = [
  'MARACUYA', 'CHOCOLATE', 'AMISTAD', 'TELEFONO', 'CANCION', 'PANTALLA', 'CALABAZA', 
  'AVENTURA', 'BICICLETA', 'CANGURO', 'DINOSAURIO', 'ESTRELLA', 'FANTASMA', 'GIRASOL', 
  'HELADO', 'JUGUETE', 'KANGURO', 'LIMONADA', 'MARIPOSA', 'NARANJA', 'OCULTAR', 
  'PALMERA', 'QUERIDO', 'RINOCERONTE', 'SORPRESA', 'TORTUGA', 'UNIVERSO', 'VALIENTE', 
  'ZAPATILLA', 'CUMPLEAÑOS', 'BOMBON', 'CASCADA', 'DOMINGO', 'ESCORPION'
];

module.exports = {
  commands: ['ahorcado', 'hangman'],

  async execute(ctx) {
    const { sock, remoteJid, args, sender, msg } = ctx;
    const input = args.join(' ').toUpperCase().trim();

    // 1. INICIAR JUEGO
    if (!sesiones.has(remoteJid)) {
      const palabra = palabras[Math.floor(Math.random() * palabras.length)];
      sesiones.set(remoteJid, {
        palabra,
        oculta: Array(palabra.length).fill('_'),
        letrasUsadas: [],
        vidas: new Map() // Aquí guardamos las vidas de cada jugador individualmente
      });
      return sock.sendMessage(remoteJid, { text: `🎮 *¡Nuevo Ahorcado!* \nLa palabra tiene ${palabra.length} letras.\n\nPalabra: ${Array(palabra.length).fill('_').join(' ')}\n\n💡 Escribe *.ahorcado [letra]* para participar.` }, { quoted: msg });
    }

    const juego = sesiones.get(remoteJid);

    // Inicializar vidas del jugador si es nuevo en esta partida
    if (!juego.vidas.has(sender)) {
      juego.vidas.set(sender, 6);
    }

    let vidasJugador = juego.vidas.get(sender);

    if (vidasJugador <= 0) {
      return sock.sendMessage(remoteJid, { text: '❌ Ya te quedaste sin vidas en esta partida, ¡espera a la siguiente!', mentions: [sender] }, { quoted: msg });
    }

    // 2. LÓGICA DE JUEGO
    if (input.length === 1 && /^[A-Z]$/.test(input)) {
      if (juego.letrasUsadas.includes(input)) {
        return sock.sendMessage(remoteJid, { text: `⚠️ La letra ${input} ya se usó.` });
      }

      juego.letrasUsadas.push(input);

      if (juego.palabra.includes(input)) {
        // Acierto
        for (let i = 0; i < juego.palabra.length; i++) {
          if (juego.palabra[i] === input) juego.oculta[i] = input;
        }
      } else {
        // Fallo
        juego.vidas.set(sender, vidasJugador - 1);
        vidasJugador--;
      }
    } else {
      return sock.sendMessage(remoteJid, { text: '❌ Escribe una sola letra para jugar.' });
    }

    // 3. RESULTADOS
    const palabraActual = juego.oculta.join('');
    if (palabraActual === juego.palabra) {
      sesiones.delete(remoteJid);
      const xp = 100;
      await db.addXP(sender, xp);
      return sock.sendMessage(remoteJid, { text: `🏆 *¡Victoria!* @${sender.split('@')[0]} ha completado la palabra: *${juego.palabra}*.\n\n🎁 Ganaste ${xp} XP.`, mentions: [sender] });
    }

    if (vidasJugador === 0) {
      return sock.sendMessage(remoteJid, { text: `💀 @${sender.split('@')[0]} estás eliminado de esta partida. Te quedan 0 vidas.`, mentions: [sender] });
    }

    await sock.sendMessage(remoteJid, { 
      text: `Palabra: ${juego.oculta.join(' ')}\n\n📝 Usadas: ${juego.letrasUsadas.join(', ')}\n❤️ Tu vida: ${vidasJugador}`
    });
  }
};
