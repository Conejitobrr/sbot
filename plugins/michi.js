'use strict';

const db = require('../lib/database');

// Almacena las partidas activas por grupo/chat
const sessions = new Map();

// Función vital para que las menciones de WhatsApp funcionen (formato JID limpio)
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
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

function checkWin(board, mark) {
  return WIN_COMBOS.some(combo => combo.every(idx => board[idx] === mark));
}

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

// IA inteligente para el Bot
function getBotMove(board) {
  for (let i = 0; i < 9; i++) {
    if (typeof board[i] === 'number') {
      const backup = board[i]; board[i] = 'O';
      if (checkWin(board, 'O')) { board[i] = backup; return i; }
      board[i] = backup;
    }
  }
  for (let i = 0; i < 9; i++) {
    if (typeof board[i] === 'number') {
      const backup = board[i]; board[i] = 'X';
      if (checkWin(board, 'X')) { board[i] = backup; return i; }
      board[i] = backup;
    }
  }
  if (typeof board[4] === 'number') return 4;
  const corners = [0, 2, 6, 8].filter(i => typeof board[i] === 'number');
  if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];
  const available = board.filter(i => typeof i === 'number');
  if (available.length > 0) return board.indexOf(available[Math.floor(Math.random() * available.length)]);
  return -1;
}

// ⏳ FUNCIÓN DE ABANDONO POR 1 MINUTO
function startTimeout(sock, remoteJid, session) {
  if (session.timeoutId) clearTimeout(session.timeoutId);
  session.timeoutId = setTimeout(async () => {
    const currentTurn = session.turn;
    const winner = currentTurn === session.player1 ? session.player2 : session.player1;
    
    let txt = '';
    const mentions = [];

    if (session.player2 === 'bot') {
       txt = `⏱️ *¡TIEMPO AGOTADO!*\n\n@${session.player1.split('@')[0]} tardaste más de 1 minuto en mover. Pierdes por inactividad.`;
       mentions.push(session.player1);
       if (session.bet > 0) {
         try { await db.removeXP(session.player1, session.bet); } catch(e){}
         txt += `\n💸 Perdiste los *${session.bet} XP* apostados.`;
       }
    } else {
       txt = `⏱️ *¡TIEMPO AGOTADO!*\n\n@${currentTurn.split('@')[0]} tardó más de 1 minuto en responder.\n🏆 ¡@${winner.split('@')[0]} gana automáticamente por abandono!`;
       mentions.push(currentTurn, winner);
       if (session.bet > 0) {
         try { await db.removeXP(currentTurn, session.bet); } catch(e){}
         try { await db.addXP(winner, session.bet); } catch(e){}
         txt += `\n💰 @${winner.split('@')[0]} se lleva el pozo de *${session.bet * 2} XP*.`;
       }
    }

    sessions.delete(remoteJid);
    sock.sendMessage(remoteJid, { text: txt, mentions });
  }, 60 * 1000); // 60 segundos exactos
}

// GESTIÓN DE FINAL DE PARTIDA (Dar XP y anunciar ganador)
async function endGame(sock, remoteJid, session, result, winner = null, loser = null, msg) {
  clearTimeout(session.timeoutId);
  sessions.delete(remoteJid);
  
  let txt = '';
  const mentions = [];
  
  if (result === 'win') {
     txt = `🏆 *¡HAY UN GANADOR!* 🏆\n\n🥇 Ganador: @${winner.split('@')[0]}\n`;
     if (loser !== 'bot') mentions.push(winner, loser);
     else mentions.push(winner);
     
     txt += renderBoard(session.board);
     
     if (session.bet > 0) {
       if (loser === 'bot') {
         try { await db.addXP(winner, session.bet); } catch(e){}
         txt += `\n💰 ¡Le ganaste a la máquina! Te llevas *+${session.bet} XP*.`;
       } else if (winner === 'bot') {
         try { await db.removeXP(loser, session.bet); } catch(e){}
         txt += `\n💸 @${loser.split('@')[0]} perdió sus *${session.bet} XP* apostados contra el sistema.`;
       } else {
         try { await db.addXP(winner, session.bet); } catch(e){}
         try { await db.removeXP(loser, session.bet); } catch(e){}
         txt += `\n💰 @${winner.split('@')[0]} le quita los *${session.bet} XP* apostados a @${loser.split('@')[0]}.`;
       }
     } else {
         if (winner !== 'bot') {
             try { await db.addXP(winner, 50); } catch(e){}
             txt += `\n🎁 Te llevas *+50 XP* por la victoria.`;
         }
     }
  } else if (result === 'tie') {
     txt = `🤝 *¡EMPATE!* 🤝\n\nEl tablero se ha llenado y ninguno cedió espacio.\n`;
     txt += renderBoard(session.board);
     
     if (session.player2 !== 'bot') mentions.push(session.player1, session.player2);
     else mentions.push(session.player1);
     
     if (session.bet > 0) {
        txt += `\n♻️ El pozo de *${session.bet} XP* ha sido devuelto a los jugadores (Nadie pierde su dinero).`;
     } else {
        try { await db.addXP(session.player1, 10); } catch(e){}
        if (session.player2 !== 'bot') { try { await db.addXP(session.player2, 10); } catch(e){} }
        txt += `\n🎁 Recompensa de consolación: *+10 XP* para cada uno.`;
     }
  }
  
  sock.sendMessage(remoteJid, { text: txt, mentions }, { quoted: msg });
}

module.exports = {
  commands: ['michi', 'tictactoe', 'tresenraya'],

  async execute(ctx) {
    const { sock, remoteJid, msg, sender, args, fromGroup } = ctx;

    if (!fromGroup) {
      return sock.sendMessage(remoteJid, { text: '❌ Este juego solo se puede disfrutar en grupos.' }, { quoted: msg });
    }

    const p1 = cleanJid(sender);
    const session = sessions.get(remoteJid);
    const action = args[0] ? args[0].toLowerCase().trim() : '';

    // ⛔ LÓGICA DE CANCELACIÓN Y RENDICIÓN
    if (['salir', 'cancelar', 'abandonar'].includes(action)) {
      if (!session) return sock.sendMessage(remoteJid, { text: '❌ No hay ninguna partida activa en este grupo.' }, { quoted: msg });
      if (session.player1 !== p1 && session.player2 !== p1) {
        return sock.sendMessage(remoteJid, { text: '❌ No eres parte de esta partida. Solo los jugadores pueden cancelarla.' }, { quoted: msg });
      }
      
      clearTimeout(session.timeoutId);
      sessions.delete(remoteJid);
      
      if (session.bet > 0) {
        const winner = session.player1 === p1 ? session.player2 : session.player1;
        let finalMsg = `🏳️ @${p1.split('@')[0]} ha huido como un cobarde y pierde sus *${session.bet} XP* apostados.`;
        const mentions = [p1];
        try { await db.removeXP(p1, session.bet); } catch(e){}

        if (winner !== 'bot') {
            try { await db.addXP(winner, session.bet); } catch(e){}
            finalMsg += `\n💰 @${winner.split('@')[0]} se lleva el pozo entero por abandono del rival.`;
            mentions.push(winner);
        }
        return sock.sendMessage(remoteJid, { text: finalMsg, mentions }, { quoted: msg });
      } else {
        return sock.sendMessage(remoteJid, { text: `🏳️ @${p1.split('@')[0]} ha cancelado la partida de michi.`, mentions: [p1] }, { quoted: msg });
      }
    }

    // 🟢 CREAR NUEVA PARTIDA (BOT O PVP)
    if (!session) {
      let target = getTarget(msg);
      let bet = 0;

      // Extraer el monto de apuesta de los argumentos (ej: .michi 500)
      for (const arg of args) {
        const num = parseInt(arg);
        if (!isNaN(num) && num > 0 && !arg.includes('@')) {
          bet = num;
          break;
        }
      }

      if (target === p1) return sock.sendMessage(remoteJid, { text: '❌ No puedes jugar contigo mismo. Menciona a otro o escribe solo .michi para jugar contra mí.' }, { quoted: msg });
      
      // Si no menciona a nadie, juega directo con el bot
      if (!target) target = 'bot';

      // 🛑 Verificar Economía de Ambos Jugadores
      if (bet > 0) {
         const p1Data = await db.getUser(p1);
         if ((p1Data.xp || 0) < bet) {
             return sock.sendMessage(remoteJid, { text: `❌ No tienes suficientes XP para apostar *${bet}*. Tienes *${p1Data.xp || 0} XP*.` }, { quoted: msg });
         }
         if (target !== 'bot') {
             const p2Data = await db.getUser(target);
             if ((p2Data.xp || 0) < bet) {
                 return sock.sendMessage(remoteJid, { text: `❌ @${target.split('@')[0]} no tiene suficientes XP para igualar tu apuesta de *${bet}*.`, mentions: [target] }, { quoted: msg });
             }
         }
      }

      // Configuración de la sesión
      const newSession = {
        player1: p1,
        player2: target,
        board: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        turn: p1,
        bet: bet,
        timeoutId: null
      };
      sessions.set(remoteJid, newSession);
      startTimeout(sock, remoteJid, newSession);

      let txt = '';
      const mentions = [p1];

      if (target === 'bot') {
        txt += `🤖 *¡DUELO CONTRA EL BOT!* 🤖\n\n`;
        if (bet > 0) txt += `💸 *Apostaste:* ${bet} XP\n\n`;
        txt += `❌ Tú juegas con: ❌\n⭕ SiriusBot juega con: ⭕\n`;
        txt += renderBoard(newSession.board);
        txt += `\n👉 Te toca @${p1.split('@')[0]}.\n⏳ Tienes 1 minuto para responder enviando \`.michi [1-9]\``;
      } else {
        txt += `⚔️ *¡NUEVO DESAFÍO A MUERTE!* ⚔️\n\n`;
        if (bet > 0) txt += `💸 *Pozo total:* ${bet * 2} XP\n\n`;
        txt += `❌ Jugador 1: @${p1.split('@')[0]}\n⭕ Jugador 2: @${target.split('@')[0]}\n`;
        txt += renderBoard(newSession.board);
        txt += `\n👉 Comienza @${p1.split('@')[0]}.\n⏳ Tienes 1 minuto para responder enviando \`.michi [1-9]\``;
        mentions.push(target);
      }

      return sock.sendMessage(remoteJid, { text: txt, mentions }, { quoted: msg });
    }

    // 🎮 PROCESAMIENTO DE TURNOS (DURANTE LA PARTIDA)
    if (session) {
      if (session.player1 !== p1 && session.player2 !== p1) {
        return sock.sendMessage(remoteJid, { text: '❌ Hay un juego ejecutándose ahora mismo. Espera a que terminen su partida.' }, { quoted: msg });
      }

      if (session.turn !== p1) {
        return sock.sendMessage(remoteJid, { text: `⏳ No te adelantes, es el turno de @${session.turn.split('@')[0]}.`, mentions: [session.turn] }, { quoted: msg });
      }

      const move = parseInt(action);
      if (isNaN(move) || move < 1 || move > 9) {
        return sock.sendMessage(remoteJid, { text: '❌ Casilla inválida. Elige un número del 1 al 9.\nEjemplo: *.michi 5*' }, { quoted: msg });
      }

      const index = move - 1;
      if (typeof session.board[index] !== 'number') {
        return sock.sendMessage(remoteJid, { text: '❌ Esa casilla ya está ocupada por otra marca. Elige una libre.' }, { quoted: msg });
      }

      // Marcar jugada en el tablero
      const currentMark = (session.turn === session.player1) ? 'X' : 'O';
      session.board[index] = currentMark;

      // 1. Revisar si el jugador ganó
      if (checkWin(session.board, currentMark)) {
        return endGame(sock, remoteJid, session, 'win', p1, p1 === session.player1 ? session.player2 : session.player1, msg);
      }

      // 2. Revisar si hay empate
      if (session.board.every(val => typeof val === 'string')) {
        return endGame(sock, remoteJid, session, 'tie', null, null, msg);
      }

      // 3. Cambiar de turno
      session.turn = (session.turn === session.player1) ? session.player2 : session.player1;

      // 4. Turno del Bot (si estás jugando solo)
      if (session.turn === 'bot') {
        const botIndex = getBotMove(session.board);
        if (botIndex !== -1) {
          session.board[botIndex] = 'O';

          if (checkWin(session.board, 'O')) {
            return endGame(sock, remoteJid, session, 'win', 'bot', session.player1, msg);
          }

          if (session.board.every(val => typeof val === 'string')) {
            return endGame(sock, remoteJid, session, 'tie', null, null, msg);
          }
        }
        session.turn = session.player1; 
      }

      // 5. Reiniciar el cronómetro de la muerte para el siguiente jugador
      startTimeout(sock, remoteJid, session);

      // Renderizar el tablero actualizado para que el otro mueva
      const nextPlayer = session.turn;
      let nextTxt = `🎮 *TURNO CAMBIADO* 🎮\n`;
      nextTxt += renderBoard(session.board);
      nextTxt += `\n👉 Siguiente turno: @${nextPlayer.split('@')[0]} (*${nextPlayer === session.player1 ? '❌' : '⭕'}*)\n`;
      nextTxt += `⏳ Tienes 1 minuto para responder.`;

      return sock.sendMessage(remoteJid, { text: nextTxt, mentions: [nextPlayer] }, { quoted: msg });
    }
  }
};
