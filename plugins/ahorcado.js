'use strict';

const db = require('../lib/database');
const sesiones = new Map();

// Lista expandida: más de 60 palabras variadas y comunes
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

// Dibujos ASCII integrados
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

    // 1. INICIAR O BUSCAR JUEGO
    if (!sesiones.has(remoteJid)) {
      const palabra = palabras[Math.floor(Math.random() * palabras.length)];
      sesiones.set(remoteJid, {
        palabra,
        oculta: Array(palabra.length).fill('_'),
        letrasUsadas: [],
        vidas: new Map() 
      });
      return sock.sendMessage(remoteJid, { 
          text: `🎮 *¡Nuevo Ahorcado!* \n\n${ahorcadoASCII[0]}\n\nPalabra: ${Array(palabra.length).fill('_').join(' ')}\n\n💡 Escribe *.ahorcado [letra]* para participar.` 
      }, { quoted: msg });
    }

    const juego = sesiones.get(remoteJid);

    // Inicializar vidas del jugador (6 intentos)
    if (!juego.vidas.has(sender)) {
      juego.vidas.set(sender, 6);
    }

    let vidasJugador = juego.vidas.get(sender);

    if (vidasJugador <= 0) {
      return sock.sendMessage(remoteJid, { text: '❌ Ya te quedaste sin vidas en esta partida. ¡Espera a la siguiente!', mentions: [sender] }, { quoted: msg });
    }

    // 2. LÓGICA DE JUEGO (LETRAS)
    if (input.length === 1 && /^[A-Z]$/.test(input)) {
      if (juego.letrasUsadas.includes(input)) {
        return sock.sendMessage(remoteJid, { text: `⚠️ La letra *${input}* ya se usó.` });
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
      return sock.sendMessage(remoteJid, { text: '❌ Por favor, escribe solo una letra.' });
    }

    // 3. CALCULAR FALLOS (6 - vidas = índice del dibujo)
    const fallos = 6 - vidasJugador;
    const dibujo = ahorcadoASCII[fallos] || ahorcadoASCII[6];

    // 4. RESULTADOS
    const palabraActual = juego.oculta.join('');
    
    if (palabraActual === juego.palabra) {
      sesiones.delete(remoteJid);
      const xp = 100;
      await db.addXP(sender, xp);
      return sock.sendMessage(remoteJid, { 
          text: `🏆 *¡VICTORIA!* \n\nLa palabra era: *${juego.palabra}*\nGanador: @${sender.split('@')[0]}\n\n🎁 Ganaste *${xp} XP*.`, 
          mentions: [sender] 
      });
    }

    if (vidasJugador === 0) {
      return sock.sendMessage(remoteJid, { 
          text: `💀 *¡ESTÁS AHORCADO!*\n\n${dibujo}\n\nPerdiste, @${sender.split('@')[0]}. La palabra era: *${juego.palabra}*.`, 
          mentions: [sender] 
      });
    }

    // 5. MOSTRAR ESTADO
    await sock.sendMessage(remoteJid, { 
      text: `${dibujo}\n\nPalabra: ${juego.oculta.join(' ')}\n\n📝 Usadas: ${juego.letrasUsadas.join(', ')}\n❤️ Tus vidas: ${vidasJugador}`
    });
  }
};
