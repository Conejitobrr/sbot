'use strict';

const db = require('../lib/database');
const sesiones = new Map();

const palabras = [
  'AVION', 'ZAPATO', 'LINTERNA', 'MONTAÑA', 'PELOTA', 'DORMITORIO', 'HELICOPTERO',
  'TELEVISION', 'CANGREJO', 'CASCADA', 'ESCORPION', 'BICICLETA', 'GUITARRA', 'CALABAZA',
  'FANTASMA', 'ESTRELLA', 'JIRAFA', 'HIPOPOTAMO', 'MARIPOSA', 'NARANJA', 'PIZARRA',
  'CUMPLEAÑOS', 'BOMBON', 'DOMINGO', 'DINOSAURIO', 'PANTALLA', 'CANCIOM', 'AMISTAD',
  'AVENTURA', 'GIRASOL', 'HELADO', 'JUGUETE', 'LIMONADA', 'PALMERA', 'QUERIDO',
  'RINOCERONTE', 'SORPRESA', 'TORTUGA', 'UNIVERSO', 'VALIENTE', 'ZAPATILLA', 'CORTINA',
  'VENTANA', 'CUADERNO', 'MOCHILA', 'PISCINA', 'ESPEJO', 'RELOJ', 'CAMISETA', 'CORBATA',
  'MALETA', 'PARAGUAS', 'ESCULTURA', 'FOTOGRAFIA', 'BICICLETA', 'CENICERO', 'BANCO'
];

const ahorcadoASCII = [
`  +---+
  |   |
      |
      |
      |
      |
=========`,
`  +---+
  |   |
  O   |
      |
      |
      |
=========`,
`  +---+
  |   |
  O   |
  |   |
      |
      |
=========`,
`  +---+
  |   |
  O   |
 /|   |
      |
      |
=========`,
`  +---+
  |   |
  O   |
 /|\\  |
      |
      |
=========`,
`  +---+
  |   |
  O   |
 /|\\  |
 /    |
      |
=========`,
`  +---+
  |   |
  O   |
 /|\\  |
 / \\  |
      |
=========`
];

module.exports = {
  commands: ['ahorcado', 'hangman'],

  async execute(ctx) {
    const { sock, remoteJid, args, sender, msg } = ctx;
    const input = args.join(' ').toUpperCase().trim();

    if (!sesiones.has(remoteJid)) {
      const palabra = palabras[Math.floor(Math.random() * palabras.length)];
      sesiones.set(remoteJid, {
        palabra,
        oculta: Array(palabra.length).fill('_'),
        letrasUsadas: [],
        vidas: new Map() 
      });
      return sock.sendMessage(remoteJid, { 
          text: `🎮 *¡Nuevo Ahorcado!* \n\n${ahorcadoASCII[0]}\n\nPalabra: ${Array(palabra.length).fill('_').join(' ')}\n\n💡 Escribe *.ahorcado [letra]* o adivina la palabra completa.` 
      }, { quoted: msg });
    }

    const juego = sesiones.get(remoteJid);
    if (!juego.vidas.has(sender)) juego.vidas.set(sender, 6);
    let vidasJugador = juego.vidas.get(sender);

    if (vidasJugador <= 0) {
      return sock.sendMessage(remoteJid, { text: '❌ Estás eliminado de esta partida.', mentions: [sender] }, { quoted: msg });
    }

    // --- NUEVA LÓGICA: ADIVINAR PALABRA COMPLETA ---
    if (input.length > 1) {
      if (input === juego.palabra) {
        // GANÓ POR PALABRA COMPLETA
        sesiones.delete(remoteJid);
        const xp = 150; // Premio mayor por adivinar la palabra entera
        await db.addXP(sender, xp);
        return sock.sendMessage(remoteJid, { 
            text: `🎉 *¡INCREÍBLE!* @${sender.split('@')[0]} adivinó la palabra completa: *${juego.palabra}*.\n\n🎁 Ganaste *${xp} XP*.`, 
            mentions: [sender] 
        });
      } else {
        // FALLÓ LA PALABRA COMPLETA -> PENALIZACIÓN
        vidasJugador = vidasJugador - 2; // Pierdes 2 vidas por arriesgarte y fallar
        juego.vidas.set(sender, vidasJugador);
        await sock.sendMessage(remoteJid, { text: `❌ *${input}* no es la palabra. ¡Pierdes 2 vidas por arriesgarte! Te quedan ${vidasJugador}.`, mentions: [sender] });
      }
    } 
    // --- LÓGICA DE LETRAS ---
    else if (input.length === 1 && /^[A-Z]$/.test(input)) {
      if (juego.letrasUsadas.includes(input)) return sock.sendMessage(remoteJid, { text: `⚠️ Ya usaste la letra *${input}*.` });

      juego.letrasUsadas.push(input);
      if (juego.palabra.includes(input)) {
        for (let i = 0; i < juego.palabra.length; i++) {
          if (juego.palabra[i] === input) juego.oculta[i] = input;
        }
      } else {
        juego.vidas.set(sender, vidasJugador - 1);
        vidasJugador--;
      }
    } else {
      return sock.sendMessage(remoteJid, { text: '❌ Escribe una letra o la palabra completa.' });
    }

    // Comprobar estado final
    const fallos = Math.max(0, 6 - vidasJugador);
    const dibujo = ahorcadoASCII[fallos];

    if (juego.oculta.join('') === juego.palabra) {
      sesiones.delete(remoteJid);
      const xp = 100;
      await db.addXP(sender, xp);
      return sock.sendMessage(remoteJid, { text: `🏆 *¡Victoria!* La palabra era: *${juego.palabra}*. Ganador: @${sender.split('@')[0]}. 🎁 Ganaste *${xp} XP*.`, mentions: [sender] });
    }

    if (vidasJugador <= 0) {
      return sock.sendMessage(remoteJid, { text: `💀 *¡ESTÁS AHORCADO!*\n\n${dibujo}\n\nPerdiste @${sender.split('@')[0]}. La palabra era: *${juego.palabra}*.`, mentions: [sender] });
    }

    await sock.sendMessage(remoteJid, { 
      text: `${dibujo}\n\nPalabra: ${juego.oculta.join(' ')}\n\n📝 Usadas: ${juego.letrasUsadas.join(', ')}\n❤️ Tus vidas: ${vidasJugador}`
    });
  }
};
