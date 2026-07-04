'use strict';

const db = require('../lib/database');

// Mapeo de juegos por grupo. Clave: remoteJid, Valor: Array de partidas activas.
const groupSessions = new Map();
const MAX_GAMES_PER_GROUP = 3;
const MAX_BET = 2000; // 🔥 LÍMITE MÁXIMO DE APUESTA

// ==========================================
// FUNCIÓN MEJORADA DE MENCIONES
// ==========================================
function cleanJid(jid = '') {
    if (!jid) return '';
    const str = String(jid);
    const user = str.split(':')[0].split('@')[0];
    const domain = str.includes('@') ? str.split('@')[1] : 's.whatsapp.net';
    return `${user}@${domain}`;
}

function number(jid = '') {
    return String(jid).split(':')[0].split('@')[0].replace(/\D/g, '');
}

function getTarget(msg) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
    if (quoted) return cleanJid(quoted);
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (mentioned) return cleanJid(mentioned);
    return null;
}

// ==========================================
// MECÁNICAS DEL TRES EN RAYA
// ==========================================
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
    if (val === 'X') return '✖️'; // X Negra
    if (val === 'O') return '⭕';  // O Roja
    return numEmojis[val];
  });
  return `\n  ${b[0]} │ ${b[1]} │ ${b[2]} \n ───┼───┼─── \n  ${b[3]} │ ${b[4]} │ ${b[5]} \n ───┼───┼─── \n  ${b[6]} │ ${b[7]} │ ${b[8]} \n`;
}

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

// ==========================================
// GESTIÓN DE SESIONES MÚLTIPLES Y TIMEOUTS
// ==========================================
function getUserGame(remoteJid, userJid) {
    const games = groupSessions.get(remoteJid) || [];
    return games.find(g => g.player1 === userJid || g.player2 === userJid);
}

function removeGame(remoteJid, session) {
    if (session.timeoutId) clearTimeout(session.timeoutId);
    let games = groupSessions.get(remoteJid) || [];
    games = games.filter(g => g !== session);
    if (games.length === 0) groupSessions.delete(remoteJid);
    else groupSessions.set(remoteJid, games);
}

function startTimeout(sock, remoteJid, session) {
  if (session.timeoutId) clearTimeout(session.timeoutId);
  
  session.timeoutId = setTimeout(async () => {
    const currentTurn = session.turn;

    // 🔥 SISTEMA ANTI-ROBOS: Si P2 nunca jugó, la partida no fue aceptada.
    if (!session.accepted) {
        let txt = `⏱️ *¡EL DESAFÍO HA EXPIRADO!*\n\nEl rival no aceptó la partida a tiempo o estaba inactivo.`;
        if (session.bet > 0) {
            try { await db.addXP(session.player1, session.bet); } catch(e){}
            txt += `\n♻️ La partida se cancela y se le devuelven los *${session.bet} XP* a @${number(session.player1)}.`;
        } else {
            txt += `\n♻️ La partida ha sido cancelada sin penalizaciones.`;
        }
        removeGame(remoteJid, session);
        return sock.sendMessage(remoteJid, { text: txt, mentions: [session.player1] });
    }

    // 🏆 CASTIGO NORMAL (ABANDONO EN MEDIO DEL JUEGO OFICIAL)
    const winner = currentTurn === session.player1 ? session.player2 : session.player1;
    let txt = '';
    const mentions = [];

    if (session.player2 === 'bot') {
       txt = `⏱️ *¡TIEMPO AGOTADO!*\n\n@${number(session.player1)} tardaste más de 1 minuto en mover. Pierdes por inactividad.`;
       mentions.push(session.player1);
       if (session.bet > 0) {
         txt += `\n💸 Perdiste los *${session.bet} XP* que apostaste.`;
       }
    } else {
       txt = `⏱️ *¡TIEMPO AGOTADO!*\n\n@${number(currentTurn)} tardó más de 1 minuto en responder y se rindió automáticamente.\n🏆 ¡@${number(winner)} gana por abandono!`;
       mentions.push(currentTurn, winner);
       if (session.bet > 0) {
         try { await db.addXP(winner, session.bet * 2); } catch(e){}
         txt += `\n💰 @${number(winner)} se lleva el pozo de *${session.bet * 2} XP*.`;
       }
    }

    removeGame(remoteJid, session);
    sock.sendMessage(remoteJid, { text: txt, mentions });
  }, 60 * 1000); // 60 segundos
}

async function endGame(sock, remoteJid, session, result, winner = null, loser = null, msg) {
  removeGame(remoteJid, session);
  
  let txt = '';
  const mentions = [];
  
  if (result === 'win') {
     txt = `🏆 *¡HAY UN GANADOR!* 🏆\n\n🥇 Ganador: @${number(winner)}\n`;
     if (loser !== 'bot') mentions.push(winner, loser);
     else mentions.push(winner);
     
     txt += renderBoard(session.board);
     
     if (session.bet > 0) {
       if (loser === 'bot') {
         try { await db.addXP(winner, session.bet * 2); } catch(e){} 
         txt += `\n💰 ¡Le ganaste a la máquina! Te llevas el premio de *${session.bet * 2} XP*.`;
       } else if (winner === 'bot') {
         txt += `\n💸 @${number(loser)} perdió sus *${session.bet} XP* apostados contra el sistema.`;
       } else {
         try { await db.addXP(winner, session.bet * 2); } catch(e){} 
         txt += `\n💰 @${number(winner)} se lleva el pozo completo de *${session.bet * 2} XP*.`;
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
        try { await db.addXP(session.player1, session.bet); } catch(e){}
        if (session.player2 !== 'bot') { try { await db.addXP(session.player2, session.bet); } catch(e){} }
        txt += `\n♻️ El pozo ha sido devuelto a los jugadores.`;
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
    const session = getUserGame(remoteJid, p1);
    const action = args[0] ? args[0].toLowerCase().trim() : '';

    // ⛔ LÓGICA DE RENDICIÓN O CANCELACIÓN
    if (['salir', 'cancelar', 'abandonar'].includes(action)) {
      if (!session) return sock.sendMessage(remoteJid, { text: '❌ No estás en ninguna partida activa.' }, { quoted: msg });
      
      removeGame(remoteJid, session);
      
      // Si la partida aún no fue aceptada, es una cancelación segura.
      if (!session.accepted) {
          let finalMsg = `🏳️ @${number(p1)} ha cancelado el desafío antes de que empiece oficialmente.`;
          if (session.bet > 0) {
              try { await db.addXP(session.player1, session.bet); } catch(e){}
              finalMsg += `\n♻️ Se devolvieron los *${session.bet} XP* apostados a @${number(session.player1)}.`;
          }
          return sock.sendMessage(remoteJid, { text: finalMsg, mentions: [p1, session.player1] }, { quoted: msg });
      }

      // Si fue aceptada, se cuenta como rendición y el otro gana.
      if (session.bet > 0) {
        const winner = session.player1 === p1 ? session.player2 : session.player1;
        let finalMsg = `🏳️ @${number(p1)} se ha rendido en plena partida.`;
        const mentions = [p1];

        if (winner !== 'bot') {
            try { await db.addXP(winner, session.bet * 2); } catch(e){}
            finalMsg += `\n💰 @${number(winner)} se lleva el pozo de *${session.bet * 2} XP* por abandono del rival.`;
            mentions.push(winner);
        }
        return sock.sendMessage(remoteJid, { text: finalMsg, mentions }, { quoted: msg });
      } else {
        return sock.sendMessage(remoteJid, { text: `🏳️ @${number(p1)} se ha rendido.`, mentions: [p1] }, { quoted: msg });
      }
    }

    // 🟢 CREAR NUEVA PARTIDA
    if (!session) {
      if (getUserGame(remoteJid, p1)) {
        return sock.sendMessage(remoteJid, { text: '❌ Ya estás en una partida activa. Termina o cancela esa primero con *.michi salir*.' }, { quoted: msg });
      }

      let games = groupSessions.get(remoteJid) || [];
      if (games.length >= MAX_GAMES_PER_GROUP) {
          return sock.sendMessage(remoteJid, { text: `❌ Ya hay ${MAX_GAMES_PER_GROUP} partidas simultáneas en este grupo. Espera a que termine una para jugar.` }, { quoted: msg });
      }

      let target = getTarget(msg);
      let bet = 0;

      for (const arg of args) {
        const num = parseInt(arg);
        if (!isNaN(num) && num > 0 && !arg.includes('@')) {
          bet = num;
          break;
        }
      }

      // 🔥 VALIDACIÓN DE LÍMITE DE APUESTA
      if (bet > MAX_BET) {
          return sock.sendMessage(remoteJid, { text: `❌ La apuesta máxima permitida es de *${MAX_BET} XP*.` }, { quoted: msg });
      }

      if (target === p1) return sock.sendMessage(remoteJid, { text: '❌ No puedes jugar contigo mismo. Menciona a otro o escribe solo *.michi* para jugar contra mí.' }, { quoted: msg });
      
      if (!target) target = 'bot';

      if (target !== 'bot' && getUserGame(remoteJid, target)) {
         return sock.sendMessage(remoteJid, { text: `❌ @${number(target)} ya está jugando otra partida en este momento. Espera a que termine.`, mentions: [target] }, { quoted: msg });
      }

      // Verificamos y descontamos a Jugador 1 (El creador)
      if (bet > 0) {
         const p1Data = await db.getUser(p1);
         if ((p1Data.xp || 0) < bet) {
             return sock.sendMessage(remoteJid, { text: `❌ No tienes suficientes XP para apostar *${bet}*. Tienes *${p1Data.xp || 0} XP*.` }, { quoted: msg });
         }
         if (target !== 'bot') {
             const p2Data = await db.getUser(target);
             if ((p2Data.xp || 0) < bet) {
                 return sock.sendMessage(remoteJid, { text: `❌ @${number(target)} no tiene suficientes XP para igualar tu apuesta de *${bet}*.`, mentions: [target] }, { quoted: msg });
             }
         }
         
         await db.removeXP(p1, bet); // Solo descontamos a P1, P2 paga al aceptar.
      }

      const newSession = {
        player1: p1,
        player2: target,
        board: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        turn: p1,
        bet: bet,
        accepted: target === 'bot', // Si es contra el bot, se acepta automáticamente
        timeoutId: null
      };
      
      games.push(newSession);
      groupSessions.set(remoteJid, games);
      startTimeout(sock, remoteJid, newSession);

      let txt = '';
      const mentions = [p1];

      if (target === 'bot') {
        txt += `🤖 *¡DUELO CONTRA EL BOT!* 🤖\n\n`;
        if (bet > 0) txt += `💸 *Apostaste:* ${bet} XP\n\n`;
        txt += `✖️ Tú juegas con: ✖️\n⭕ SiriusBot juega con: ⭕\n`;
        txt += renderBoard(newSession.board);
        txt += `\n👉 Te toca @${number(p1)}.\n⏳ Tienes 1 minuto para responder enviando \`.michi [1-9]\``;
      } else {
        txt += `⚔️ *¡NUEVO DESAFÍO A MUERTE!* ⚔️\n\n`;
        if (bet > 0) txt += `💸 *Pozo total:* ${bet * 2} XP\n\n`;
        txt += `✖️ Jugador 1: @${number(p1)}\n⭕ Jugador 2: @${number(target)}\n`;
        txt += renderBoard(newSession.board);
        txt += `\n👉 Comienza @${number(p1)}.\n⏳ @${number(target)} para aceptar el duelo, haz un movimiento en tu turno.\n\nEscribe \`.michi [1-9]\``;
        mentions.push(target);
      }

      return sock.sendMessage(remoteJid, { text: txt, mentions }, { quoted: msg });
    }

    // 🎮 PROCESAMIENTO DE TURNOS
    if (session) {
      if (session.turn !== p1) {
        return sock.sendMessage(remoteJid, { text: `⏳ No te adelantes, es el turno de @${number(session.turn)}.`, mentions: [session.turn] }, { quoted: msg });
      }

      const move = parseInt(action);
      if (isNaN(move) || move < 1 || move > 9) {
        return sock.sendMessage(remoteJid, { text: '❌ Casilla inválida. Elige un número del 1 al 9.\nEjemplo: *.michi 5*' }, { quoted: msg });
      }

      const index = move - 1;
      if (typeof session.board[index] !== 'number') {
        return sock.sendMessage(remoteJid, { text: '❌ Esa casilla ya está ocupada por otra marca. Elige una libre.' }, { quoted: msg });
      }

      // 🔥 SISTEMA ANTI-ROBOS: Si Jugador 2 mueve, el desafío es oficialmente aceptado y se le cobra.
      if (p1 === session.player2 && !session.accepted) {
          if (session.bet > 0) {
              const p2Data = await db.getUser(p1);
              if ((p2Data.xp || 0) < session.bet) {
                  // Si P2 gastó su dinero mientras esperaba su turno, se cancela todo
                  removeGame(remoteJid, session);
                  try { await db.addXP(session.player1, session.bet); } catch(e){}
                  return sock.sendMessage(remoteJid, { text: `❌ @${number(session.player2)} ya no tiene los *${session.bet} XP* para igualar la apuesta.\n\nEl desafío se canceló y se le devolvió el dinero a @${number(session.player1)}.`, mentions: [session.player2, session.player1] }, { quoted: msg });
              }
              await db.removeXP(session.player2, session.bet);
          }
          session.accepted = true; // ¡Partida oficialmente en curso!
      }

      const currentMark = (session.turn === session.player1) ? 'X' : 'O';
      session.board[index] = currentMark;

      if (checkWin(session.board, currentMark)) {
        return endGame(sock, remoteJid, session, 'win', p1, p1 === session.player1 ? session.player2 : session.player1, msg);
      }

      if (session.board.every(val => typeof val === 'string')) {
        return endGame(sock, remoteJid, session, 'tie', null, null, msg);
      }

      session.turn = (session.turn === session.player1) ? session.player2 : session.player1;

      // Turno automático del Bot
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

      startTimeout(sock, remoteJid, session);

      const nextPlayer = session.turn;
      let nextTxt = `🎮 *TURNO CAMBIADO* 🎮\n`;
      nextTxt += renderBoard(session.board);
      nextTxt += `\n👉 Siguiente turno: @${number(nextPlayer)} (*${nextPlayer === session.player1 ? '✖️' : '⭕'}*)\n`;
      nextTxt += `⏳ Tienes 1 minuto para responder.`;

      return sock.sendMessage(remoteJid, { text: nextTxt, mentions: [nextPlayer] }, { quoted: msg });
    }
  }
};
