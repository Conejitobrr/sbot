'use strict';

const db = require('../lib/database');

// Almacena las partidas activas por grupo/chat
const sessions = new Map();

function cleanJid(jid = '') { 
  return String(jid).split(':')[0] + '@s.whatsapp.net'; 
}

function getTarget(msg) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quoted) return cleanJid(quoted);
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (mentioned) return cleanJid(mentioned);
  return null;
}

// Combinaciones ganadoras del Tres en Raya
const WIN_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Filas
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columnas
  [0, 4, 8], [2, 4, 6]             // Diagonales
];

function checkWin(board, mark) {
  return WIN_COMBOS.some(combo => combo.every(idx => board[idx] === mark));
}

// Renderiza el tablero de forma visual y limpia
function renderBoard(board) {
  const numEmojis = {
    1: '1️⃣', 2: '2️⃣', 3: '3️⃣',
    4: '4️⃣', 5: '5️⃣', 6: '6️⃣',
    7: '7️⃣', 8: '8️⃣', 9: '9️⃣'
  };
  
  const b = board.map(val => {
    if (val === 'X') return '❌';
    if (val === 'O') return '⭕';
    return numEmojis[val];
  });

  return `\n  ${b[0]} │ ${b[1]} │ ${b[2]} \n ───┼───┼─── \n  ${b[3]} │ ${b[4]} │ ${b[5]} \n ───┼───┼─── \n  ${b[6]} │ ${b[7]} │ ${b[8]} \n`;
}

// IA inteligente para los movimientos del Bot
function getBotMove(board) {
  // 1. ¿Puede ganar el bot ('O') en este turno?
  for (let i = 0; i < 9; i++) {
    if (typeof board[i] === 'number') {
      const backup = board[i];
      board[i] = 'O';
      if (checkWin(board, 'O')) { board[i] = backup; return i; }
      board[i] = backup;
    }
  }
  // 2. ¿Puede ganar el rival ('X')? Bloquearlo inmediatamente
  for (let i = 0; i < 9; i++) {
    if (typeof board[i] === 'number') {
      const backup = board[i];
      board[i] = 'X';
      if (checkWin(board, 'X')) { board[i] = backup; return i; }
      board[i] = backup;
    }
  }
  // 3. Priorizar el centro si está libre
  if (typeof board[4] === 'number') return 4;
  // 4. Tomar esquinas libres al azar
  const corners = [0, 2, 6, 8].filter(i => typeof board[i] === 'number');
  if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];
  // 5. Cualquier otra disponible
  const available = board.filter(i => typeof i === 'number');
  if (available.length > 0) {
    const moveValue = available[Math.floor(Math.random() * available.length)];
    return board.indexOf(moveValue);
  }
  return -1;
}

module.exports = {
  commands: ['michi', 'tictactoe', 'tresenraya'],

  async execute(ctx) {
    const { sock, remoteJid, msg, sender, args, command, fromGroup } = ctx;

    if (!fromGroup) {
      return sock.sendMessage(remoteJid, { text: '❌ Este juego solo se puede disfrutar en grupos.' }, { quoted: msg });
    }

    const p1 = cleanJid(sender);
    const session = sessions.get(remoteJid);
    const action = args[0] ? args[0].toLowerCase().trim() : '';

    // LÓGICA: ABANDONAR O SALIR DE UNA PARTIDA
    if (['salir', 'cancelar', 'abandonar'].includes(action)) {
      if (!session) return sock.sendMessage(remoteJid, { text: '❌ No hay ninguna partida activa en este grupo.' }, { quoted: msg });
      if (session.player1 !== p1 && session.player2 !== p1) {
        return sock.sendMessage(remoteJid, { text: '❌ No eres parte de esta partida.' }, { quoted: msg });
      }
      sessions.delete(remoteJid);
      return sock.sendMessage(remoteJid, { text: `🏳️ Partida cancelada por abandono.` }, { quoted: msg });
    }

    // SI NO HAY PARTIDA ACTIVA: CREAR UNA NUEVA
    if (!session) {
      const target = getTarget(msg);

      if (action === 'bot') {
        // Jugar contra la Inteligencia Artificial
        const newSession = {
          player1: p1,
          player2: 'bot',
          board: [1, 2, 3, 4, 5, 6, 7, 8, 9],
          turn: p1
        };
        sessions.set(remoteJid, newSession);

        let txt = `🎮 *¡PARTIDA INICIADA CONTRA SIRIUSBOT!* 🎮\n`;
        txt += `• Tú juegas con: ❌\n• El bot juega con: ⭕\n`;
        txt += renderBoard(newSession.board);
        txt += `\n👉 Te toca @${p1.split('@')[0]}. Elige un número usando *.michi [1-9]*`;

        return sock.sendMessage(remoteJid, { text: txt, mentions: [p1] }, { quoted: msg });
      } 
      
      if (target) {
        if (target === p1) return sock.sendMessage(remoteJid, { text: '❌ No puedes jugar contigo mismo.' }, { quoted: msg });

        // Desafiar a un jugador del grupo
        const newSession = {
          player1: p1,
          player2: target,
          board: [1, 2, 3, 4, 5, 6, 7, 8, 9],
          turn: p1
        };
        sessions.set(remoteJid, newSession);

        let txt = `⚔️ *¡DESAFÍO EN CURSO!* ⚔️\n\n`;
        txt += `❌ Ladrón/Jugador 1: @${p1.split('@')[0]}\n`;
        txt += `⭕ Víctima/Jugador 2: @${target.split('@')[0]}\n`;
        txt += renderBoard(newSession.board);
        txt += `\n👉 Comienza @${p1.split('@')[0]}. Elige casilla con *.michi [1-9]*`;

        return sock.sendMessage(remoteJid, { text: txt, mentions: [p1, target] }, { quoted: msg });
      }

      // Menú explicativo si se introduce mal el comando
      const helpText = `🎮 *JUEGO DEL MICHI* (Tres en Raya) 🎮\n\n` +
        `Para iniciar un duelo, utiliza:\n` +
        `👉 *.michi bot* (Jugar contra la IA)\n` +
        `👉 *.michi @usuario* (Desafiar a alguien en el grupo)\n\n` +
        `*Cómo hacer un movimiento:*\n` +
        `Una vez empiece, marca tu casilla usando *.michi [Número del 1 al 9]* en tu turno.\n` +
        `Usa *.michi salir* para darte por vencido.`;

      return sock.sendMessage(remoteJid, { text: helpText }, { quoted: msg });
    }

    // SI YA HAY UNA PARTIDA EN CURSO: PROCESAR JUGADA
    if (session) {
      if (session.player1 !== p1 && session.player2 !== p1) {
        return sock.sendMessage(remoteJid, { text: '❌ Hay un juego ejecutándose ahora mismo. Espera a que termine.' }, { quoted: msg });
      }

      if (session.turn !== p1) {
        return sock.sendMessage(remoteJid, { text: '⏳ No es tu turno. Ten paciencia.' }, { quoted: msg });
      }

      const move = parseInt(action);
      if (isNaN(move) || move < 1 || move > 9) {
        return sock.sendMessage(remoteJid, { text: '❌ Casilla inválida. Elige un número del 1 al 9.' }, { quoted: msg });
      }

      const index = move - 1;
      if (typeof session.board[index] !== 'number') {
        return sock.sendMessage(remoteJid, { text: '❌ Esa casilla ya está ocupada. Elige otra.' }, { quoted: msg });
      }

      // Marcar movimiento del Jugador 1 o Jugador 2
      const currentMark = (session.turn === session.player1) ? 'X' : 'O';
      session.board[index] = currentMark;

      // 1. Verificar si el jugador actual ganó
      if (checkWin(session.board, currentMark)) {
        let finalTxt = `🏆 *¡HAY UN GANADOR!* 🏆\n\n🥇 Ganador: @${p1.split('@')[0]}\n`;
        finalTxt += renderBoard(session.board);
        finalTxt += `\n🎁 Te has llevado *+80 XP* de recompensa por tu victoria.`;

        try { await db.addXP(p1, 80); } catch (e) {}
        sessions.delete(remoteJid);
        return sock.sendMessage(remoteJid, { text: finalTxt, mentions: [p1] }, { quoted: msg });
      }

      // 2. Verificar si hubo empate (tablero lleno)
      if (session.board.every(val => typeof val === 'string')) {
        let finalTxt = `🤝 *¡EMPATE TRABADO!* 🤝\n\nEl tablero se ha llenado y ninguno cedió espacio.\n`;
        finalTxt += renderBoard(session.board);
        finalTxt += `\nRecompensa de consolación: *+20 XP* para los participantes.`;

        try { await db.addXP(session.player1, 20); } catch (e) {}
        if (session.player2 !== 'bot') { try { await db.addXP(session.player2, 20); } catch (e) {} }

        sessions.delete(remoteJid);
        return sock.sendMessage(remoteJid, { text: finalTxt, mentions: session.player2 !== 'bot' ? [session.player1, session.player2] : [session.player1] }, { quoted: msg });
      }

      // 3. CAMBIAR TURNO
      session.turn = (session.turn === session.player1) ? session.player2 : session.player1;

      // 4. TURNO AUTOMÁTICO DEL BOT (SI CORRESPONDE)
      if (session.turn === 'bot') {
        const botIndex = getBotMove(session.board);
        if (botIndex !== -1) {
          session.board[botIndex] = 'O';

          // Verificar si ganó el Bot
          if (checkWin(session.board, 'O')) {
            let finalTxt = `🤖 *¡SIRIUSBOT HA GANADO!* 🤖\n\n💥 El bot fue superior esta vez. @${session.player1.split('@')[0]}, suerte para la próxima.\n`;
            finalTxt += renderBoard(session.board);
            sessions.delete(remoteJid);
            return sock.sendMessage(remoteJid, { text: finalTxt, mentions: [session.player1] }, { quoted: msg });
          }

          // Verificar empate tras la jugada del bot
          if (session.board.every(val => typeof val === 'string')) {
            let finalTxt = `🤝 *¡EMPATE TRABADO!* 🤝\n\nEl juego terminó sin espacios libres.\n`;
            finalTxt += renderBoard(session.board);
            try { await db.addXP(session.player1, 20); } catch (e) {}
            sessions.delete(remoteJid);
            return sock.sendMessage(remoteJid, { text: finalTxt, mentions: [session.player1] }, { quoted: msg });
          }
        }
        // Regresa el turno al jugador real
        session.turn = session.player1;
      }

      // Enviar estado del tablero actualizado para continuar el juego
      const nextPlayer = session.turn;
      let nextTxt = `🎮 *PARTIDA DE MICHI EN CURSO* 🎮\n`;
      nextTxt += renderBoard(session.board);
      nextTxt += `\n👉 Siguiente turno: @${nextPlayer.split('@')[0]} (*${nextPlayer === session.player1 ? '❌' : '⭕'}*)\n`;
      nextTxt += `Usa *.michi [1-9]* para colocar tu marca.`;

      return sock.sendMessage(remoteJid, { text: nextTxt, mentions: [nextPlayer] }, { quoted: msg });
    }
  }
};
