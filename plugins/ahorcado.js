'use strict';

const db = require('../lib/database'); // Tu base de datos para dar los XP

// Memoria temporal para guardar los juegos activos de cada grupo
const sesiones = new Map();

// Lista de palabras (puedes agregar todas las que quieras)
const palabras = [
  'PROGRAMACION', 'SERVIDOR', 'WHATSAPP', 'COMPUTADORA',
  'INTERNET', 'TECLADO', 'SISTEMA', 'JAVASCRIPT',
  'COMUNIDAD', 'DESARROLLADOR', 'MASCOTA', 'AVENTURA',
  'GALAXY', 'VIDEOJUEGO', 'STREAMING', 'INTELIGENCIA'
];

// Dibujos del ahorcado según los errores
const ahorcadoASCII = [
`
  +---+
  |   |
      |
      |
      |
      |
=========`,
`
  +---+
  |   |
  O   |
      |
      |
      |
=========`,
`
  +---+
  |   |
  O   |
  |   |
      |
      |
=========`,
`
  +---+
  |   |
  O   |
 /|   |
      |
      |
=========`,
`
  +---+
  |   |
  O   |
 /|\\  |
      |
      |
=========`,
`
  +---+
  |   |
  O   |
 /|\\  |
 /    |
      |
=========`,
`
  +---+
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

    // 1. INICIAR UN JUEGO NUEVO
    if (!input || input === 'NUEVO') {
      if (sesiones.has(remoteJid)) {
        return sock.sendMessage(remoteJid, {
          text: `⚠️ Ya hay un juego activo en este grupo.\n\nEscribe *.ahorcado [letra]* para intentar adivinar, o *.ahorcado rendirse* para terminarlo.`
        }, { quoted: msg });
      }

      const palabraElegida = palabras[Math.floor(Math.random() * palabras.length)];
      
      const nuevoJuego = {
        palabra: palabraElegida,
        oculta: Array(palabraElegida.length).fill('_'),
        letrasUsadas: [],
        errores: 0,
        maxErrores: 6
      };

      sesiones.set(remoteJid, nuevoJuego);

      const tablero = 
`🎮 *¡NUEVO JUEGO DE AHORCADO!* 🎮

${ahorcadoASCII[0]}

Palabra:  ${nuevoJuego.oculta.join(' ')}

💡 Usa: *.ahorcado [letra]* para jugar.`;

      return sock.sendMessage(remoteJid, { text: tablero }, { quoted: msg });
    }

    // Si escriben algo pero no hay juego activo
    if (!sesiones.has(remoteJid)) {
      return sock.sendMessage(remoteJid, {
        text: '❌ No hay ningún juego de ahorcado activo.\nEscribe *.ahorcado* para empezar uno.'
      }, { quoted: msg });
    }

    const juego = sesiones.get(remoteJid);

    // 2. RENDIRSE
    if (input === 'RENDIRSE' || input === 'SALIR') {
      const palabraReal = juego.palabra;
      sesiones.delete(remoteJid);
      return sock.sendMessage(remoteJid, {
        text: `🏳️ Se han rendido.\n\nLa palabra era: *${palabraReal}*\n¡Más suerte la próxima vez!`
      }, { quoted: msg });
    }

    // 3. ADIVINAR LETRA O PALABRA COMPLETA
    const esLetra = input.length === 1;
    const esPalabra = input.length > 1;

    // Si intenta la palabra completa
    if (esPalabra) {
      if (input === juego.palabra) {
        sesiones.delete(remoteJid);
        const xpGanado = Math.floor(Math.random() * 50) + 50; // Da entre 50 y 100 XP
        await db.addXP(sender, xpGanado);

        return sock.sendMessage(remoteJid, {
          text: `🎉 *¡INCREÍBLE!* 🎉\n\nHas adivinado la palabra exacta: *${juego.palabra}*\n\n🎁 ¡Has ganado *${xpGanado} XP* por tu hazaña!`,
          mentions: [sender]
        }, { quoted: msg });
      } else {
        juego.errores++;
      }
    } 
    // Si intenta una letra
    else if (esLetra) {
      if (!/^[A-Z]$/.test(input)) {
        return sock.sendMessage(remoteJid, { text: '❌ Solo se permiten letras de la A a la Z.' }, { quoted: msg });
      }

      if (juego.letrasUsadas.includes(input)) {
        return sock.sendMessage(remoteJid, { text: `⚠️ Ya intentaron con la letra *${input}*. Intenta con otra.` }, { quoted: msg });
      }

      juego.letrasUsadas.push(input);

      if (juego.palabra.includes(input)) {
        // Revelar la letra en los espacios
        for (let i = 0; i < juego.palabra.length; i++) {
          if (juego.palabra[i] === input) {
            juego.oculta[i] = input;
          }
        }
      } else {
        juego.errores++;
      }
    }

    // 4. COMPROBAR VICTORIA O DERROTA
    const palabraActual = juego.oculta.join('');

    if (palabraActual === juego.palabra) {
      sesiones.delete(remoteJid);
      const xpGanado = Math.floor(Math.random() * 30) + 20; // Recompensa normal
      await db.addXP(sender, xpGanado);

      return sock.sendMessage(remoteJid, {
        text: `🏆 *¡VICTORIA!* 🏆\n\n${ahorcadoASCII[juego.errores]}\n\nPalabra completada: *${juego.palabra}*\n\n🎁 Te llevas *${xpGanado} XP*.`,
        mentions: [sender]
      }, { quoted: msg });
    }

    if (juego.errores >= juego.maxErrores) {
      const palabraReal = juego.palabra;
      sesiones.delete(remoteJid);
      return sock.sendMessage(remoteJid, {
        text: `💀 *¡ESTÁS AHORCADO!* 💀\n\n${ahorcadoASCII[6]}\n\nPerdieron. La palabra era: *${palabraReal}*`
      }, { quoted: msg });
    }

    // 5. MOSTRAR ESTADO ACTUAL
    const estado = 
`${ahorcadoASCII[juego.errores]}

Palabra:  ${juego.oculta.join(' ')}

📝 Letras usadas: ${juego.letrasUsadas.join(', ')}
❤️ Vidas: ${juego.maxErrores - juego.errores}`;

    await sock.sendMessage(remoteJid, { text: estado }, { quoted: msg });
  }
};
